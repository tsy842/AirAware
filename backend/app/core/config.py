from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AirAware"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "airaware_hackathon_super_secret_jwt_key_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    SQLITE_DB_URL: str = "sqlite:///./airaware.db"
    GEMINI_API_KEY: Optional[str] = None
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
