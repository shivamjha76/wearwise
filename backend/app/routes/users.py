import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.core.dependencies import get_current_user
from app.core.storage import get_upload_dir

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

ALLOWED_AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5 MB


@router.get("/me", response_model=UserResponse)
def get_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve the authenticated user's profile details."""
    return current_user


@router.post("/profile-picture", response_model=UserResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and set a new profile picture for the current user."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image file provided"
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_AVATAR_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{ext}'. Allowed types: {', '.join(sorted(ALLOWED_AVATAR_EXTENSIONS))}"
        )

    unique_filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:10]}{ext}"
    upload_dir = get_upload_dir()
    file_path = upload_dir / unique_filename

    file_size = 0
    try:
        with open(file_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                file_size += len(chunk)
                if file_size > MAX_AVATAR_SIZE:
                    buffer.close()
                    if file_path.exists():
                        file_path.unlink()
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Profile image size exceeds maximum limit of 5MB"
                    )
                buffer.write(chunk)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save profile picture: {str(e)}"
        )

    # Delete old avatar file if it exists and was an upload
    if current_user.avatar_url and current_user.avatar_url.startswith("/uploads/"):
        old_filename = current_user.avatar_url.replace("/uploads/", "").strip()
        if old_filename:
            old_file = upload_dir / old_filename
            if old_file.exists():
                try:
                    old_file.unlink()
                except Exception:
                    pass

    current_user.avatar_url = f"/uploads/{unique_filename}"
    db.commit()
    db.refresh(current_user)

    return current_user


@router.delete("/profile-picture", response_model=UserResponse)
def remove_profile_picture(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove the current user's profile picture."""
    if current_user.avatar_url and current_user.avatar_url.startswith("/uploads/"):
        upload_dir = get_upload_dir()
        old_filename = current_user.avatar_url.replace("/uploads/", "").strip()
        if old_filename:
            old_file = upload_dir / old_filename
            if old_file.exists():
                try:
                    old_file.unlink()
                except Exception:
                    pass

    current_user.avatar_url = None
    db.commit()
    db.refresh(current_user)

    return current_user


@router.post("/", deprecated=True)
def create_user():
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Direct unauthenticated user creation is deprecated. Please register via /auth/register with a secure password."
    )