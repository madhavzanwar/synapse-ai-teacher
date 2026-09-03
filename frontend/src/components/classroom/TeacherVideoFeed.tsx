'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Hand,
  MessageSquare,
  Radio,
  Globe,
  Video,
  VideoOff,
} from 'lucide-react';
import { parseEmotionFromScript } from '@/lib/utils';
import { LanguageCode } from '@/types';

interface TeacherVideoFeedProps {
  script: string;
  isSpeaking: boolean;
  isRemediating?: boolean;
  onInterrupt?: () => void;
  onSwitchLanguage?: (newLang: LanguageCode) => void;
  language?: string;
  audioBase64?: string | null;
}

export const TeacherVideoFeed: React.FC<TeacherVideoFeedProps> = ({
  script,
  isSpeaking,
  isRemediating = false,
  onInterrupt,
  onSwitchLanguage,
  language = 'English',
  audioBase64 = null,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [displayedCaption, setDisplayedCaption] = useState('');
  const [avatarEmotion, setAvatarEmotion] = useState<
    'enthusiastic' | 'thoughtful' | 'encouraging' | 'curious' | 'empathetic' | 'neutral'
  >('enthusiastic');
  const [audioWaves, setAudioWaves] = useState<number[]>([15, 25, 45, 60, 30, 75, 40, 20]);
  const [webRtcActive, setWebRtcActive] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Parse emotion and clean text from raw script
  useEffect(() => {
    if (!script) {
      setDisplayedCaption('');
      return;
    }

    const { cleanText, emotion } = parseEmotionFromScript(script);
    setDisplayedCaption(cleanText);
    setAvatarEmotion(emotion);

    // If backend sent synthesized Base64 audio, play via HTML5 Audio
    if (audioBase64 && !isMuted) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audioRef.current = audio;
      audio.play().catch((e) => console.log('Audio autoplay prevented:', e));
      return;
    }

    // Fallback: Browser Speech Synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && !isMuted) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);

      const voices = window.speechSynthesis.getVoices();
      if (language === 'Hindi' || language === 'Hinglish') {
        const hiVoice = voices.find((v) => v.lang.includes('hi') || v.lang.includes('IN'));
        if (hiVoice) utterance.voice = hiVoice;
      } else if (language === 'Spanish') {
        const esVoice = voices.find((v) => v.lang.includes('es'));
        if (esVoice) utterance.voice = esVoice;
      }

      utterance.rate = emotion === 'enthusiastic' ? 1.05 : emotion === 'thoughtful' ? 0.95 : 1.0;
      utterance.pitch = 1.04;
      speechSynthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }, [script, isMuted, language, audioBase64]);

  // Animated procedural avatar canvas drawing & audio telemetry
  useEffect(() => {
    let animationFrameId: number;
    let phase = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      phase += 0.05;
      const width = canvas.width;
      const height = canvas.height;

      const isPraising = avatarEmotion === 'encouraging' && !isRemediating;

      // Dark midnight navy canvas background gradient
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.45,
        20,
        width / 2,
        height / 2,
        width * 0.7
      );
      if (isRemediating) {
        bgGrad.addColorStop(0, '#1a140b');
      } else if (isPraising) {
        bgGrad.addColorStop(0, '#0a1a14');
      } else {
        bgGrad.addColorStop(0, '#0c1722');
      }
      bgGrad.addColorStop(1, '#000000');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Procedural Teacher Avatar Halo
      ctx.beginPath();
      const haloRadius = 75 + (isSpeaking ? Math.sin(phase * 4) * 6 : 0);
      const haloGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.42,
        35,
        width / 2,
        height * 0.42,
        haloRadius
      );

      if (isRemediating) {
        haloGrad.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
      } else if (isPraising) {
        haloGrad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
      } else {
        haloGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      }
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = haloGrad;
      ctx.arc(width / 2, height * 0.42, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // Stylized Avatar Head
      ctx.beginPath();
      ctx.arc(width / 2, height * 0.42, 48, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isRemediating
        ? 'rgba(245, 158, 11, 0.6)'
        : isPraising
        ? 'rgba(16, 185, 129, 0.6)'
        : 'rgba(255, 255, 255, 0.3)';
      ctx.stroke();

      // Avatar Eyes
      const eyeOffset = Math.sin(phase * 1.5) * 1.5;
      ctx.fillStyle = isPraising ? '#34d399' : '#f8fafc';
      ctx.beginPath();
      ctx.arc(width / 2 - 16, height * 0.40 + eyeOffset, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(width / 2 + 16, height * 0.40 + eyeOffset, 4, 0, Math.PI * 2);
      ctx.fill();

      // Avatar Mouth
      ctx.beginPath();
      const mouthOpen = isSpeaking ? Math.abs(Math.sin(phase * 6.5)) * 9 + 2 : 2;
      ctx.ellipse(width / 2, height * 0.48, 9, mouthOpen, 0, 0, Math.PI * 2);
      ctx.fillStyle = isRemediating ? '#f59e0b' : 'rgba(255, 255, 255, 0.8)';
      ctx.fill();

      // Shoulders / Torso
      ctx.beginPath();
      ctx.moveTo(width / 2 - 60, height);
      ctx.quadraticCurveTo(width / 2 - 40, height * 0.65, width / 2, height * 0.65);
      ctx.quadraticCurveTo(width / 2 + 40, height * 0.65, width / 2 + 60, height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();

      // Waveform bars simulation
      if (isSpeaking) {
        setAudioWaves((prev) =>
          prev.map((_, i) => Math.floor(Math.sin(phase * 4 + i) * 35 + 45))
        );
      } else {
        setAudioWaves([10, 10, 10, 10, 10, 10, 10, 10]);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSpeaking, isRemediating, avatarEmotion]);

  const toggleMute = () => {
    if (!isMuted) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
    setIsMuted(!isMuted);
  };

  const isPraising = avatarEmotion === 'encouraging' && !isRemediating;

  // Velorah dynamic glowing dropshadows reacting to teacher state
  const shadowGlowClass = isRemediating
    ? 'shadow-[0_0_30px_rgba(245,158,11,0.2)]'
    : isPraising
    ? 'shadow-[0_0_30px_rgba(16,185,129,0.2)]'
    : 'shadow-[0_0_30px_rgba(255,255,255,0.1)]';

  const getEmotionBadge = () => {
    switch (avatarEmotion) {
      case 'empathetic':
        return { label: 'Empathetic', color: 'bg-white/[0.06] text-sky-200 border-white/[0.12]' };
      case 'enthusiastic':
        return { label: 'Enthusiastic', color: 'bg-white/[0.06] text-emerald-200 border-white/[0.12]' };
      case 'thoughtful':
        return { label: 'Thoughtful', color: 'bg-white/[0.06] text-neutral-200 border-white/[0.12]' };
      case 'encouraging':
        return { label: 'Encouraging', color: 'bg-white/[0.06] text-amber-200 border-white/[0.12]' };
      case 'curious':
        return { label: 'Curious', color: 'bg-white/[0.06] text-teal-200 border-white/[0.12]' };
      default:
        return { label: 'Engaged', color: 'bg-white/[0.06] text-neutral-200 border-white/[0.12]' };
    }
  };

  const badge = getEmotionBadge();

  return (
    <div
      className={`relative flex flex-col h-full rounded-2xl liquid-glass ${shadowGlowClass} overflow-hidden transition-all duration-300`}
    >
      {/* Top Header Controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] backdrop-blur-md">
            <span
              className={`w-2 h-2 rounded-full ${
                isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
              }`}
            />
            <span className="text-[11px] font-medium text-white tracking-wide">
              {isSpeaking ? 'Synapse Live' : 'Listening'}
            </span>
          </div>

          <span
            className={`px-2.5 py-0.5 text-[10px] font-medium rounded-full border backdrop-blur-md ${badge.color}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Dynamic Language Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-neutral-200 text-[11px] transition-colors"
              title="Switch Instruction Language"
            >
              <Globe className="w-3 h-3 text-neutral-300" />
              <span>{language}</span>
            </button>

            {showLanguageMenu && (
              <div className="absolute right-0 mt-1 w-28 liquid-glass-strong border border-white/[0.1] rounded-xl shadow-xl overflow-hidden z-30">
                {(['English', 'Hindi', 'Hinglish', 'Spanish'] as LanguageCode[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      if (onSwitchLanguage) onSwitchLanguage(lang);
                      setShowLanguageMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/10 hover:text-white transition-colors font-light"
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={toggleMute}
            className="p-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-neutral-300 hover:text-white transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-300" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Avatar Stage Canvas / Viewport */}
      <div className="relative flex-1 flex items-center justify-center min-h-[200px]">
        {webRtcActive ? (
          <video
            id="webrtc-avatar-video"
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={360}
            height={260}
            className="w-full h-full object-cover"
          />
        )}

        {/* Audio Spectrum Waveform Bar */}
        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1 px-4 pointer-events-none">
          {audioWaves.map((height, idx) => (
            <motion.div
              key={idx}
              className="w-1 rounded-full bg-white/60"
              animate={{ height: `${Math.max(height * 0.35, 4)}px` }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            />
          ))}
        </div>
      </div>

      {/* Centered Semi-Transparent Liquid-Glass Subtitles Pill */}
      <div className="p-3 bg-white/[0.02] border-t border-white/[0.06] backdrop-blur-md">
        <div className="liquid-glass-subtle rounded-xl p-3 max-h-24 overflow-y-auto">
          <p className="text-xs text-neutral-200 font-['Inter'] font-light tracking-wide leading-relaxed text-center">
            {displayedCaption || 'Preparing personalized lesson delivery...'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between">
          <span className="text-[11px] text-neutral-500 font-light">
            Engine: <span className="text-neutral-300">{audioBase64 ? 'ElevenLabs Sonic' : 'Neural Speech'}</span>
          </span>

          <button
            onClick={onInterrupt}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-neutral-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] transition-colors"
          >
            <Hand className="w-3.5 h-3.5 text-neutral-300" />
            Raise Hand
          </button>
        </div>
      </div>
    </div>
  );
};
