import json
import logging
import sys
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional

from app.config import settings

_RESERVED_LOG_RECORD_ATTRS = set(
    logging.LogRecord("", 0, "", 0, "", (), None).__dict__.keys()
) | {"message", "asctime"}


class JsonLineFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "time": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        for key, value in record.__dict__.items():
            if key.startswith("_") or key in _RESERVED_LOG_RECORD_ATTRS:
                continue
            payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        if record.stack_info:
            payload["stack"] = self.formatStack(record.stack_info)

        return json.dumps(payload, ensure_ascii=False, default=str)


def configure_logging() -> Optional[Path]:
    root_logger = logging.getLogger()
    if getattr(root_logger, "_classroom_logging_configured", False):
        log_dir = Path(settings.LOG_DIR).expanduser()
        return log_dir / "classroom.log" if settings.LOG_TO_FILE else None

    level_name = str(settings.LOG_LEVEL or "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    root_logger.handlers.clear()
    root_logger.setLevel(level)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")
    )
    root_logger.addHandler(console_handler)

    log_file_path = None
    if settings.LOG_TO_FILE:
        log_dir = Path(settings.LOG_DIR).expanduser()
        try:
            log_dir.mkdir(parents=True, exist_ok=True)
            log_file_path = log_dir / "classroom.log"
            file_handler = RotatingFileHandler(
                log_file_path,
                maxBytes=settings.LOG_MAX_BYTES,
                backupCount=settings.LOG_BACKUP_COUNT,
                encoding="utf-8",
            )
            file_handler.setLevel(level)
            file_handler.setFormatter(JsonLineFormatter())
            root_logger.addHandler(file_handler)
        except OSError as exc:
            root_logger.warning(
                "file_logging_unavailable",
                extra={"log_dir": str(log_dir), "error": str(exc)},
            )

    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logging.getLogger(logger_name).setLevel(level)

    root_logger._classroom_logging_configured = True
    logging.getLogger(__name__).info(
        "logging_configured",
        extra={
            "log_level": level_name,
            "log_file": str(log_file_path) if log_file_path else None,
            "log_to_file": settings.LOG_TO_FILE,
        },
    )
    return log_file_path
