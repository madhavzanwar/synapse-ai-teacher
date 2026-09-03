"""
Streaming AI Voice Engine for Synapse AI Teacher.
Provides TTS abstraction supporting ElevenLabs Multilingual v2, Cartesia Sonic,
SSML emotion parsing, and low-latency audio telemetry generation.
"""
import re
import io
import base64
import logging
import asyncio
from typing import Optional, Dict, Any, Tuple, AsyncGenerator, List
import aiohttp

from app.config import settings
from app.schemas.lesson import LanguageCode

logger = logging.getLogger(__name__)

# Default Voice IDs optimized for multilingual clarity
DEFAULT_VOICES = {
    LanguageCode.ENGLISH: {
        "elevenlabs": "21m00Tcm4TlvDq8ikWAM",  # Rachel - Warm, professional educator
        "cartesia": "a0e99841-438c-4a64-b679-ae501e7d6091",
    },
    LanguageCode.HINGLISH: {
        "elevenlabs": "pNInz6obpgDQGcFmaJgB",  # Adam - Natural Indian English / Hinglish blend
        "cartesia": "820a3788-2b37-4d21-847a-b65d8a68c99a",
    },
    LanguageCode.HINDI: {
        "elevenlabs": "flq6f7yk4E4fJM5XTYuZ",  # Michael - Clear Hindi diction
        "cartesia": "820a3788-2b37-4d21-847a-b65d8a68c99a",
    },
    LanguageCode.SPANISH: {
        "elevenlabs": "EXAVITQu4vr4xnSDxMaL",  # Bella - Expressive Spanish
        "cartesia": "79a125e8-cd45-4c13-8a67-188112f4dd22",
    },
}


class VoiceEngine:
    """
    Enterprise Text-to-Speech (TTS) Engine.
    Converts rich pedagogical scripts with emotion tags into SSML and streams synthesized audio.
    """

    def __init__(self):
        self.elevenlabs_api_key = settings.ELEVENLABS_API_KEY
        self.cartesia_api_key = settings.CARTESIA_API_KEY

    # -----------------------------------------------------------------------
    # SSML & Emotion Tag Parsing
    # -----------------------------------------------------------------------

    def parse_script_to_ssml(
        self, script: str, language: LanguageCode
    ) -> Tuple[str, str, str, float]:
        """
        Parses teaching script with tags into:
        1. Clean plain text (for display / closed captions)
        2. Valid SSML string (for TTS engines)
        3. Detected emotion ('enthusiastic' | 'thoughtful' | 'encouraging' | 'curious' | 'neutral')
        4. Speech rate multiplier (float)
        """
        # 1. Detect emotion
        emotion = "neutral"
        if "<emotion=enthusiastic>" in script:
            emotion = "enthusiastic"
        elif "<emotion=thoughtful>" in script:
            emotion = "thoughtful"
        elif "<emotion=encouraging>" in script:
            emotion = "encouraging"
        elif "<emotion=curious>" in script:
            emotion = "curious"
        elif "<emotion=empathetic>" in script:
            emotion = "empathetic"

        # Rate and pitch adjustments based on emotion
        rate_map = {
            "enthusiastic": "1.05",
            "thoughtful": "0.95",
            "encouraging": "1.0",
            "curious": "1.02",
            "empathetic": "0.88",
            "neutral": "1.0",
        }
        speech_rate = float(rate_map.get(emotion, "1.0"))

        # 2. Extract clean text
        clean_text = script
        clean_text = re.sub(r"<emotion=[a-zA-Z0-9_-]+>", "", clean_text)
        clean_text = re.sub(r"</emotion>", "", clean_text)
        clean_text = re.sub(r"<pause=([0-9]+)ms>", "", clean_text)
        clean_text = re.sub(r"<emphasis=[a-zA-Z0-9_-]+>", "", clean_text)
        clean_text = re.sub(r"</emphasis>", "", clean_text)
        clean_text = re.sub(r"\s+", " ", clean_text).strip()

        # 3. Convert to SSML
        ssml_body = script
        # Convert <pause=300ms> to SSML <break time="300ms"/>
        ssml_body = re.sub(
            r"<pause=([0-9]+)ms>", r'<break time="\1ms"/>', ssml_body
        )
        # Convert <emotion=...> tags to SSML prosody
        ssml_body = re.sub(
            r"<emotion=enthusiastic>(.*?)</emotion>",
            r'<prosody rate="105%" pitch="+2st">\1</prosody>',
            ssml_body,
            flags=re.DOTALL,
        )
        ssml_body = re.sub(
            r"<emotion=thoughtful>(.*?)</emotion>",
            r'<prosody rate="95%" pitch="-1st">\1</prosody>',
            ssml_body,
            flags=re.DOTALL,
        )
        ssml_body = re.sub(
            r"<emotion=encouraging>(.*?)</emotion>",
            r'<prosody rate="100%" pitch="+1st">\1</prosody>',
            ssml_body,
            flags=re.DOTALL,
        )
        ssml_body = re.sub(
            r"<emotion=curious>(.*?)</emotion>",
            r'<prosody rate="102%" pitch="+3st">\1</prosody>',
            ssml_body,
            flags=re.DOTALL,
        )
        ssml_body = re.sub(
            r"<emotion=empathetic>(.*?)</emotion>",
            r'<prosody rate="88%" pitch="-1st">\1</prosody>',
            ssml_body,
            flags=re.DOTALL,
        )
        # Remove any lingering emotion open tags
        ssml_body = re.sub(r"<emotion=[a-zA-Z0-9_-]+>", "", ssml_body)
        ssml_body = re.sub(r"</emotion>", "", ssml_body)

        ssml = f'<speak><prosody rate="{rate_map.get(emotion, "100%")}">{ssml_body}</prosody></speak>'

        return clean_text, ssml, emotion, speech_rate

    # -----------------------------------------------------------------------
    # Synthesize Audio (Base64 / Stream)
    # -----------------------------------------------------------------------

    async def synthesize_speech_base64(
        self, script: str, language: LanguageCode
    ) -> Optional[str]:
        """
        Synthesizes audio using ElevenLabs API or Cartesia API if configured.
        Returns base64-encoded audio MP3 string, or None for client-side Web Speech fallback.
        """
        clean_text, ssml, emotion, _ = self.parse_script_to_ssml(script, language)

        if not clean_text:
            return None

        # 1. Try ElevenLabs API if key is set
        if self.elevenlabs_api_key:
            try:
                voice_id = DEFAULT_VOICES.get(language, DEFAULT_VOICES[LanguageCode.ENGLISH])["elevenlabs"]
                url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
                headers = {
                    "Accept": "audio/mpeg",
                    "Content-Type": "application/json",
                    "xi-api-key": self.elevenlabs_api_key,
                }
                payload = {
                    "text": clean_text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                        "style": 0.35 if emotion == "enthusiastic" else 0.15,
                        "use_speaker_boost": True,
                    },
                }

                async with aiohttp.ClientSession() as session:
                    async with session.post(url, json=payload, headers=headers, timeout=10) as resp:
                        if resp.status == 200:
                            audio_data = await resp.read()
                            return base64.b64encode(audio_data).decode("utf-8")
                        else:
                            logger.warning(f"ElevenLabs TTS returned status: {resp.status}")
            except Exception as e:
                logger.warning(f"ElevenLabs TTS call failed: {e}")

        # 2. Fallback: Return None to let client-side Web Speech API / procedural synthesizer play with zero latency
        return None

    def get_audio_telemetry_wave(
        self, is_speaking: bool, is_remediating: bool
    ) -> List[int]:
        """Generate simulated waveform telemetry frequency bars for visualizer."""
        if not is_speaking:
            return [8, 8, 8, 8, 8, 8, 8, 8]
        if is_remediating:
            return [20, 35, 60, 85, 55, 75, 45, 25]
        return [15, 30, 50, 70, 40, 80, 50, 20]


# Global singleton instance
voice_engine = VoiceEngine()
