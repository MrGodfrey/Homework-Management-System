import os
from pathlib import Path
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent

class Settings(BaseSettings):
    SECRET_KEY: str
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
    AI_GRADING_FAKE_RESPONSE: bool = False
    STUDENT_PORTAL_CLOSED: Optional[bool] = None
    STUDENT_PORTAL_CLOSED_MESSAGE: str = (
        "本学期课程已顺利结束，作业系统现已关闭。"
        "感谢你这个学期的认真投入；历史提交与分数查看通道已暂停开放。"
        "如有特殊情况，请联系任课老师。"
    )
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_DIR: str = os.getenv("LOG_DIR", str(BACKEND_DIR / "logs"))
    LOG_TO_FILE: bool = True
    LOG_MAX_BYTES: int = int(os.getenv("LOG_MAX_BYTES", str(10 * 1024 * 1024)))
    LOG_BACKUP_COUNT: int = int(os.getenv("LOG_BACKUP_COUNT", "7"))

    @field_validator("AI_GRADING_FAKE_RESPONSE", mode="before")
    @classmethod
    def parse_optional_bool(cls, value):
        if value is None:
            return False
        if isinstance(value, str):
            normalized = value.strip().lower()
            if not normalized:
                return False
            if normalized in {"1", "true", "yes", "on"}:
                return True
            if normalized in {"0", "false", "no", "off"}:
                return False
        return value

    @field_validator("STUDENT_PORTAL_CLOSED", mode="before")
    @classmethod
    def parse_student_portal_closed(cls, value):
        if value is None:
            return None
        if isinstance(value, str):
            normalized = value.strip().lower()
            if not normalized:
                return None
            if normalized in {"1", "true", "yes", "on"}:
                return True
            if normalized in {"0", "false", "no", "off"}:
                return False
        return value

    @property
    def student_portal_closed(self) -> bool:
        if self.STUDENT_PORTAL_CLOSED is not None:
            return self.STUDENT_PORTAL_CLOSED
        return self.ENV.upper() == "PROD"

    class Config:
        env_file = (PROJECT_ROOT / ".env", BACKEND_DIR / ".env")
        extra = "ignore"

settings = Settings()
