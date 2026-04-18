from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from app.cos_utils import using_local_storage
from app.config import settings

router = APIRouter(prefix="/api/storage", tags=["storage"])

@router.get("/local")
def download_local_storage_file(key: str = Query(...)):
    if not using_local_storage():
        raise HTTPException(status_code=404, detail="Local storage download is not enabled")

    base_dir = Path(settings.LOCAL_STORAGE_DIR).expanduser().resolve()
    target_path = (base_dir / key).resolve()
    if not str(target_path).startswith(str(base_dir)):
        raise HTTPException(status_code=400, detail="Invalid file path")
    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(target_path)
