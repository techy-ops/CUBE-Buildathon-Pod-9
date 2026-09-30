from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/recovery_manager.db"
    APP_ENV: str = "development"
    API_PREFIX: str = "/api"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
