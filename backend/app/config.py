import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    COS_SECRET_ID: str = os.getenv("COS_SECRET_ID", "")
    COS_SECRET_KEY: str = os.getenv("COS_SECRET_KEY", "")
    COS_REGION: str = os.getenv("COS_REGION", "ap-guangzhou")
    COS_BUCKET: str = os.getenv("COS_BUCKET", "")
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./classroom.db")

    class Config:
        env_file = ".env"

settings = Settings()
