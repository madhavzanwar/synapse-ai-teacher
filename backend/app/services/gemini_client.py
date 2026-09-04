"""
Compatibility layer for Gemini JSON generation.

The application uses google-genai here, while the classroom and verification
flows still keep their offline fallback behavior when no API key is configured.
"""
import json
import logging
import re
from typing import Any, Dict, Optional

import google.generativeai as genai

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
    """Generate JSON response using Google Gemini.

    This uses the google-generativeai library's GenerativeModel API.
    If the API key is missing or the call fails, None is returned.
    """
    if not settings.GEMINI_API_KEY:
        return None
    try:
        # Configure the client with the API key
        genai.configure(api_key=settings.GEMINI_API_KEY)
        # Create the model with system instruction (default to flash model if not provided)
        model = genai.GenerativeModel(
            model_name or settings.GEMINI_FLASH_MODEL,
            system_instruction=system_instruction or None
        )
        # Generate content
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
                response_mime_type="application/json",
            ),
        )
        text = (response.text or "").strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        return json.loads(text)
    except Exception as exc:
        logger.warning("%s Gemini JSON call failed: %s", caller, exc)
        return None
