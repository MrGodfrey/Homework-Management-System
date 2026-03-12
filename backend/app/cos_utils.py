from qcloud_cos import CosConfig
from qcloud_cos import CosS3Client
from app.config import settings
import logging
import sys

# Configure logging
logging.basicConfig(level=logging.INFO, stream=sys.stdout)

# Initialize COS Client
config = CosConfig(
    Region=settings.COS_REGION,
    SecretId=settings.COS_SECRET_ID or "dummy",
    SecretKey=settings.COS_SECRET_KEY or "dummy",
)
client = CosS3Client(config)

def upload_file_to_cos(file_bytes: bytes, cos_key: str) -> str:
    """Uploads file bytes to Tencent Cloud COS and returns the URL."""
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
    url = client.get_presigned_url(
        Method='GET',
        Bucket=settings.COS_BUCKET,
        Key=cos_key,
        Expired=expires
    )
    return url
