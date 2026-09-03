"""
Configuration settings using Pydantic Settings.
"""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # App Config
    APP_NAME: str = "Synapse AI Teacher Backend"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000", "*"]
    )

    # Gemini Engine
    GEMINI_API_KEY: str = Field(default="", env="GEMINI_API_KEY")
    GEMINI_MODEL: str = "gemini-1.5-pro"
    GEMINI_FLASH_MODEL: str = "gemini-1.5-flash"

    # Optional Voice & Avatar Services
    SIMLI_API_KEY: str = Field(default="", env="SIMLI_API_KEY")
    HEYGEN_API_KEY: str = Field(default="", env="HEYGEN_API_KEY")
    ELEVENLABS_API_KEY: str = Field(default="", env="ELEVENLABS_API_KEY")
    CARTESIA_API_KEY: str = Field(default="", env="CARTESIA_API_KEY")

    # Storage paths
    UPLOAD_DIR: str = "./uploads"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
