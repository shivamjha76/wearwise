import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.style_profile import StyleProfile
from app.models.wardrobe import WardrobeItem
from app.models.outfit import SavedOutfit
from app.schemas.user import UserResponse, UserUpdate
from app.core.dependencies import get_current_user
from app.core.storage import get_upload_dir
from app.services.face_vision import detect_skin_tone_from_image

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

ALLOWED_AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5 MB


@router.get("/me", response_model=UserResponse)
def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve the authenticated user's profile details with skin tone and mobile number."""
    profile = db.query(StyleProfile).filter(StyleProfile.user_id == current_user.id).first()
    current_user.skin_tone = profile.skin_tone if profile else None
    current_user.gender = profile.gender if profile else None
    return current_user


@router.put("/me", response_model=UserResponse)
def update_user_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update authenticated user's name and mobile phone number."""
    if update_data.name is not None:
        name_clean = update_data.name.strip()
        if name_clean:
            current_user.name = name_clean
    if update_data.phone is not None:
        current_user.phone = update_data.phone.strip()

    db.commit()
    db.refresh(current_user)

    profile = db.query(StyleProfile).filter(StyleProfile.user_id == current_user.id).first()
    current_user.skin_tone = profile.skin_tone if profile else None
    current_user.gender = profile.gender if profile else None
    return current_user


@router.delete("/me")
def delete_user_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently delete user account and all associated wardrobe, outfits, and photos."""
    upload_dir = get_upload_dir()

    # 1. Delete user avatar file
    if current_user.avatar_url and current_user.avatar_url.startswith("/uploads/"):
        av_file = upload_dir / current_user.avatar_url.replace("/uploads/", "").strip()
        if av_file.exists():
            try:
                av_file.unlink()
            except Exception:
                pass

    # 2. Delete user wardrobe items and files
    items = db.query(WardrobeItem).filter(WardrobeItem.user_id == current_user.id).all()
    for item in items:
        if item.image_url and item.image_url.startswith("/uploads/"):
            it_file = upload_dir / item.image_url.replace("/uploads/", "").strip()
            if it_file.exists():
                try:
                    it_file.unlink()
                except Exception:
                    pass
        db.delete(item)

    # 3. Delete saved outfits
    db.query(SavedOutfit).filter(SavedOutfit.user_id == current_user.id).delete()

    # 4. Delete style profile
    db.query(StyleProfile).filter(StyleProfile.user_id == current_user.id).delete()

    # 5. Delete user
    db.delete(current_user)
    db.commit()

    return {"message": "Account deleted successfully"}


@router.post("/profile-picture", response_model=UserResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload profile photo and automatically detect skin tone via AI."""
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

    file_bytes = bytearray()
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
                file_bytes.extend(chunk)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save profile picture: {str(e)}"
        )

    # AI Skin Tone Detection
    mime_type = file.content_type or f"image/{ext.lstrip('.')}"
    detection = detect_skin_tone_from_image(bytes(file_bytes), unique_filename, mime_type)
    detected_tone = detection.get("skin_tone") if detection.get("has_face") else None

    # Update or create user's StyleProfile
    profile = db.query(StyleProfile).filter(StyleProfile.user_id == current_user.id).first()
    if profile:
        profile.skin_tone = detected_tone
    else:
        profile = StyleProfile(
            user_id=current_user.id,
            height=175.0,
            weight=70.0,
            skin_tone=detected_tone,
            style_preference="casual",
            fit_preference="regular",
            budget=5000.0,
        )
        db.add(profile)

    # Delete old avatar file if it exists and was an upload
    if current_user.avatar_url and current_user.avatar_url.startswith("/uploads/"):
        old_filename = current_user.avatar_url.replace("/uploads/", "").strip()
        if old_filename and old_filename != unique_filename:
            old_file = upload_dir / old_filename
            if old_file.exists():
                try:
                    old_file.unlink()
                except Exception:
                    pass

    current_user.avatar_url = f"/uploads/{unique_filename}"
    db.commit()
    db.refresh(current_user)

    current_user.skin_tone = detected_tone
    current_user.gender = profile.gender if profile else None
    return current_user


@router.delete("/profile-picture", response_model=UserResponse)
def remove_profile_picture(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove the current user's profile picture and reset detected skin tone."""
    profile = db.query(StyleProfile).filter(StyleProfile.user_id == current_user.id).first()
    if profile:
        profile.skin_tone = None
        db.commit()

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

    current_user.skin_tone = None
    current_user.gender = profile.gender if profile else None
    return current_user


@router.post("/", deprecated=True)
def create_user():
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Direct unauthenticated user creation is deprecated. Please register via /auth/register with a secure password."
    )