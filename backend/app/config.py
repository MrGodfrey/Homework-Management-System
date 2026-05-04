import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Environment: DEV or PROD for COS storage isolation
    ENV: str = os.getenv("ENV", "DEV")
    
    COS_SECRET_ID: str = os.getenv("COS_SECRET_ID", "")
    COS_SECRET_KEY: str = os.getenv("COS_SECRET_KEY", "")
    COS_REGION: str = os.getenv("COS_REGION", "ap-guangzhou")
    COS_BUCKET: str = os.getenv("COS_BUCKET", "")
    LOCAL_STORAGE_DIR: str = os.getenv("LOCAL_STORAGE_DIR", "")
    PUBLIC_BASE_URL: str = os.getenv("PUBLIC_BASE_URL", "http://127.0.0.1:8000")

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./classroom.db")
    MAX_SUBMISSION_UPLOAD_BYTES: int = int(os.getenv("MAX_SUBMISSION_UPLOAD_BYTES", str(50 * 1024 * 1024)))
    TENCENT_MODEL_KEY_ID: str = os.getenv("TENCENT_MODEL_KEY_ID", "")
    TENCENT_MODEL_KEY_SECRET: str = os.getenv("TENCENT_MODEL_KEY_SECRET", "")
    HOMEWORK_SUMMARY_MODEL: str = os.getenv("HOMEWORK_SUMMARY_MODEL", "deepseek-v4-flash")
    TOKENHUB_BASE_URL: str = os.getenv("TOKENHUB_BASE_URL", "https://tokenhub.tencentmaas.com/v1/chat/completions")
    AI_GRADING_MAX_CHARS: int = int(os.getenv("AI_GRADING_MAX_CHARS", "50000"))
    AI_GRADING_FILE_MAX_CHARS: int = int(os.getenv("AI_GRADING_FILE_MAX_CHARS", "12000"))
    AI_GRADING_MAX_TOKENS: int = int(os.getenv("AI_GRADING_MAX_TOKENS", "1200"))
    AI_GRADING_TIMEOUT_SECONDS: int = int(os.getenv("AI_GRADING_TIMEOUT_SECONDS", "60"))
    AI_GRADING_DAILY_LIMIT: int = int(os.getenv("AI_GRADING_DAILY_LIMIT", "200"))
    AI_GRADING_ASSIGNMENT_DAILY_LIMIT: int = int(os.getenv("AI_GRADING_ASSIGNMENT_DAILY_LIMIT", "100"))
    AI_GRADING_FAKE_RESPONSE: bool = os.getenv("AI_GRADING_FAKE_RESPONSE", "").lower() in {"1", "true", "yes"}

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
