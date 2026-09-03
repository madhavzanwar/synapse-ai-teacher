"""
Configuration settings using Pydantic Settings.
"""
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # App Config
    APP_NAME: str = "Synapse AI Teacher Backend"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "*"]
    )

    # Gemini Engine
    GEMINI_API_KEY: str = Field(default="", env="GEMINI_API_KEY")
    GEMINI_MODEL: str = "gemini-1.5-pro"
    GEMINI_FLASH_MODEL: str = "gemini-1.5-flash"

    # ElevenLabs & Audio Engines
    ELEVENLABS_API_KEY: Optional[str] = Field(default=None, env="ELEVENLABS_API_KEY")
    CARTESIA_API_KEY: Optional[str] = Field(default=None, env="CARTESIA_API_KEY")

    # Avatar Integrations
    SIMLI_API_KEY: Optional[str] = Field(default=None, env="SIMLI_API_KEY")
    SIMLI_FACE_ID: Optional[str] = Field(default="cace3ef7-a4c4-425d-a8cf-a5358eb0c427", env="SIMLI_FACE_ID")
    HEYGEN_API_KEY: Optional[str] = Field(default=None, env="HEYGEN_API_KEY")

    # Storage paths
    UPLOAD_DIR: str = "./uploads"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
