import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.wardrobe import WardrobeItem
from app.models.uploaded_file import UploadedFile
from app.schemas.wardrobe import (
    WardrobeItemCreate,
    WardrobeItemResponse
)
from app.services.wardrobe_gap import recommend_next_item
from app.services.products import get_products_for_color, get_products_for_recommendation
from app.services.shopping_search import search_store_products, get_all_catalog_products
from app.services.vision import analyze_garment_image
from app.core.dependencies import get_current_user


from app.core.storage import get_upload_dir


router = APIRouter(
    prefix="/wardrobe",
    tags=["Wardrobe"]
)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def upload_wardrobe_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
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
    upload_dir = get_upload_dir()
    file_path = upload_dir / unique_filename

    file_bytes = bytearray()
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
            file_bytes.extend(chunk)

    mime_type = file.content_type or f"image/{ext.lstrip('.')}"

    # Persist in database for cross-container serverless permanence
    try:
        db_file = db.query(UploadedFile).filter(UploadedFile.filename == unique_filename).first()
        if not db_file:
            db_file = UploadedFile(
                filename=unique_filename,
                content_type=mime_type,
                file_data=bytes(file_bytes)
            )
            db.add(db_file)
            db.commit()
    except Exception as db_err:
        print(f"Warning: failed to persist wardrobe image in db: {db_err}")

    tags = analyze_garment_image(
        image_bytes=bytes(file_bytes),
        filename=file.filename,
        mime_type=mime_type
    )

    return {
        "image_url": f"/uploads/{unique_filename}",
        "filename": unique_filename,
        "tags": tags
    }


@router.post("/analyze")
async def analyze_clothing_image(
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

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum limit of 10MB"
        )

    mime_type = file.content_type or f"image/{ext.lstrip('.')}"
    analysis = analyze_garment_image(
        image_bytes=content,
        filename=file.filename,
        mime_type=mime_type
    )

    return analysis


class AnalyzeUrlRequest(BaseModel):
    url: str


@router.post("/analyze-url")
def analyze_clothing_url(
    req: AnalyzeUrlRequest,
    current_user: User = Depends(get_current_user),
):
    url = req.url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL must start with http:// or https://"
        )

    try:
        content = None
        content_type = "image/jpeg"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        }
        try:
            import requests
            resp = requests.get(url, headers=headers, timeout=15)
            if resp.status_code == 200:
                content = resp.content
                content_type = resp.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Could not load image from URL (HTTP {resp.status_code})"
                )
        except ImportError:
            import urllib.request
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as u_resp:
                content = u_resp.read()
                content_type = u_resp.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()

        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty response received from image URL"
            )

        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image size exceeds 10MB limit"
            )

        filename = Path(url.split("?")[0]).name or "garment.jpg"
        if not any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
            filename += ".jpg"

        analysis = analyze_garment_image(
            image_bytes=content,
            filename=filename,
            mime_type=content_type
        )
        return analysis
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to analyze image from URL: {str(exc)}"
        )


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
        file_path = get_upload_dir() / filename
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
    store: str | None = None,
    max_price: int | None = None,
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
        cat = recommendation.get("category", "shirt")
        col = recommendation.get("color", "white")
        store_products = search_store_products(
            category=cat,
            color=col,
            store_filter=store,
            max_price=max_price,
            limit=4
        )
        if not store_products:
            # Resilient fallback
            store_products = get_products_for_recommendation(
                category=cat,
                color=col
            )
        recommendation["products"] = store_products

    # Build complete curated catalog with wardrobe match indicators
    all_catalog = get_all_catalog_products(store_filter=store, max_price=max_price)
    
    missing_targets = {
        (r.get("category", "").lower(), r.get("color", "").lower()): r.get("new_outfit_combinations", 0)
        for r in recommendations
    }
    for item in all_catalog:
        item_copy = dict(item)
        key = (item.get("category", "").lower(), item.get("color", "").lower())
        if key in missing_targets:
            item_copy["is_wardrobe_match"] = True
            item_copy["multiplier"] = missing_targets[key]
        else:
            item_copy["is_wardrobe_match"] = False
            item_copy["multiplier"] = None

    return {
        "user_id": user_id,
        "recommendations": recommendations,
        "all_products": all_catalog
    }