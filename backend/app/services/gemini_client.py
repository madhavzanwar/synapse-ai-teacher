"""
Compatibility layer for Gemini JSON generation.

The application uses google-genai here, while the classroom and verification
flows still keep their offline fallback behavior when no API key is configured.
"""
import json
import logging
import re
from typing import Any, Dict, Optional

from google import genai
from google.genai import types

from app.config import settings

logger = logging.getLogger(__name__)


def generate_json(
    prompt: str,
    *,
    model_name: Optional[str] = None,
    system_instruction: str = "",
    temperature: float = 0.3,
    caller: str = "Gemini",
) -> Optional[Dict[str, Any]]:
    """Return parsed JSON from Gemini, or None when unavailable/unparseable."""
    if not settings.GEMINI_API_KEY:
        return None

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=model_name or settings.GEMINI_FLASH_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction or None,
                response_mime_type="application/json",
                temperature=temperature,
            ),
        )
        text = (response.text or "").strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        return json.loads(text)
    except Exception as exc:
        logger.warning("%s Gemini JSON call failed: %s", caller, exc)
        return None
