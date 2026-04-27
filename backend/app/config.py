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

    class Config:
        env_file = ".env"

settings = Settings()
