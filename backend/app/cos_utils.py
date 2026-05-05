from qcloud_cos import CosConfig
from qcloud_cos import CosS3Client
from app.config import settings
from pathlib import Path
from urllib.parse import quote

# Initialize COS Client
config = CosConfig(
    Region=settings.COS_REGION,
    SecretId=settings.COS_SECRET_ID or "dummy",
    SecretKey=settings.COS_SECRET_KEY or "dummy",
)
client = CosS3Client(config)

_local_storage_dir = Path(settings.LOCAL_STORAGE_DIR).expanduser() if settings.LOCAL_STORAGE_DIR else None

def using_local_storage() -> bool:
    return _local_storage_dir is not None

def _local_path(cos_key: str) -> Path:
    if _local_storage_dir is None:
        raise RuntimeError("LOCAL_STORAGE_DIR is not configured")
    return _local_storage_dir / cos_key

def _ensure_local_parent(cos_key: str) -> Path:
    path = _local_path(cos_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    return path

def upload_file_to_cos(file_bytes: bytes, cos_key: str) -> str:
    """Uploads file bytes to Tencent Cloud COS and returns the URL."""
    if using_local_storage():
        path = _ensure_local_parent(cos_key)
        path.write_bytes(file_bytes)
        return generate_presigned_url(cos_key)
    response = client.put_object(
        Bucket=settings.COS_BUCKET,
        Body=file_bytes,
        Key=cos_key,
        EnableMD5=False
    )
    # Return the object URL (without sign)
    url = f"https://{settings.COS_BUCKET}.cos.{settings.COS_REGION}.myqcloud.com/{cos_key}"
    return url

def generate_presigned_url(cos_key: str, expires: int = 600) -> str:
    """Generates a temporary presigned URL for downloading a file."""
    if using_local_storage():
        encoded_key = quote(cos_key, safe="")
        return f"{settings.PUBLIC_BASE_URL}/api/storage/local?key={encoded_key}"
    url = client.get_presigned_url(
        Method='GET',
        Bucket=settings.COS_BUCKET,
        Key=cos_key,
        Expired=expires
    )
    return url

def read_file_from_storage(cos_key: str) -> bytes:
    if using_local_storage():
        path = _local_path(cos_key)
        if not path.exists():
            raise FileNotFoundError(cos_key)
        return path.read_bytes()
    response = client.get_object(
        Bucket=settings.COS_BUCKET,
        Key=cos_key
    )
    return response["Body"].get_raw_stream().read()

def delete_file_from_storage(cos_key: str) -> None:
    if using_local_storage():
        path = _local_path(cos_key)
        if path.exists():
            path.unlink()
        return
    client.delete_object(
        Bucket=settings.COS_BUCKET,
        Key=cos_key
    )
