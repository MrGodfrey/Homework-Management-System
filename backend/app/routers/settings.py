from fastapi import APIRouter

from app.upload_limits import submission_upload_limit

router = APIRouter(
    prefix="/api/settings",
    tags=["settings"],
)


@router.get("/upload-limits")
def get_upload_limits():
    return submission_upload_limit()
