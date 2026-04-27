from app.config import settings


def format_file_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes}B"
    if size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f}KB"
    mb = size_bytes / (1024 * 1024)
    return f"{mb:.0f}MB" if mb.is_integer() else f"{mb:.1f}MB"


def submission_upload_limit() -> dict:
    max_bytes = settings.MAX_SUBMISSION_UPLOAD_BYTES
    return {
        "submission_max_bytes": max_bytes,
        "submission_max_label": format_file_size(max_bytes),
    }
