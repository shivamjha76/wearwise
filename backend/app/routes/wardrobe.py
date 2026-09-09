import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.wardrobe import WardrobeItem
from app.schemas.wardrobe import (
    WardrobeItemCreate,
    WardrobeItemResponse
)
from app.services.wardrobe_gap import recommend_next_item
from app.services.products import get_products_for_color
from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/wardrobe",
    tags=["Wardrobe"]
)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_wardrobe_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{ext}'. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_filename

    file_size = 0
    with open(file_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            file_size += len(chunk)
            if file_size > MAX_FILE_SIZE:
                buffer.close()
                if file_path.exists():
                    file_path.unlink()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File size exceeds maximum limit of 10MB"
                )
            buffer.write(chunk)

    return {
        "image_url": f"/uploads/{unique_filename}",
        "filename": unique_filename
    }


@router.post(
    "/{user_id}",
    response_model=WardrobeItemResponse
)
def add_wardrobe_item(
    user_id: int,
    item_data: WardrobeItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this wardrobe"
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    item = WardrobeItem(
        user_id=user_id,
        category=item_data.category,
        color=item_data.color,
        fit=item_data.fit,
        pattern=item_data.pattern,
        style=item_data.style,
        image_url=item_data.image_url
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@router.get(
    "/{user_id}",
    response_model=list[WardrobeItemResponse]
)
def get_wardrobe(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this wardrobe"
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return (
        db.query(WardrobeItem)
        .filter(WardrobeItem.user_id == user_id)
        .all()
    )


@router.delete("/{item_id}")
def delete_wardrobe_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = (
        db.query(WardrobeItem)
        .filter(WardrobeItem.id == item_id)
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wardrobe item not found"
        )

    if item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this wardrobe item"
        )

    if item.image_url and item.image_url.startswith("/uploads/"):
        filename = item.image_url.replace("/uploads/", "")
        file_path = UPLOAD_DIR / filename
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass

    db.delete(item)
    db.commit()

    return {
        "message": "Wardrobe item deleted successfully"
    }


@router.get("/{user_id}/next-purchase")
def next_purchase(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view recommendations for this user"
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    wardrobe = (
        db.query(WardrobeItem)
        .filter(WardrobeItem.user_id == user_id)
        .all()
    )

    recommendations = recommend_next_item(wardrobe)

    if not recommendations:
        return {
            "user_id": user_id,
            "recommendations": []
        }

    for recommendation in recommendations:

        products = get_products_for_color(
            recommendation["color"]
        )

        recommendation["products"] = products

    return {
        "user_id": user_id,
        "recommendations": recommendations
    }