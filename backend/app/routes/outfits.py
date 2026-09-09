from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.style_profile import StyleProfile
from app.models.wardrobe import WardrobeItem
from app.models.outfit import SavedOutfit
from app.schemas.outfit import SavedOutfitCreate, SavedOutfitResponse
from app.services.recommendation import generate_outfits
from app.services.ai import explain_outfit
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/outfits", tags=["Outfits"])


@router.post("/{user_id}")
def get_outfits(
    user_id: int,
    occasion: str,
    style_vibe: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to generate outfits for this user"
        )
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = db.query(StyleProfile).filter(StyleProfile.user_id == user_id).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Style profile not found")

    wardrobe = db.query(WardrobeItem).filter(WardrobeItem.user_id == user_id).all()

    if not wardrobe:
        raise HTTPException(status_code=400, detail="Wardrobe is empty")

    outfits = generate_outfits(wardrobe, profile, occasion, style_vibe)

    if not outfits:
        raise HTTPException(
            status_code=400, detail="Not enough wardrobe items to generate an outfit"
        )

    best = outfits[0]
    top = best["top"]
    bottom = best["bottom"]
    shoes = best["shoes"]

    try:
        explanation = explain_outfit(top, bottom, shoes, profile, occasion)
    except Exception as exc:
        print(repr(exc))
        explanation = "AI explanation unavailable"

    return {
        "user_id": user_id,
        "occasion": occasion,
        "style_vibe": style_vibe,
        "recommendation": {
            "top_id": best["top"].id,
            "bottom_id": best["bottom"].id,
            "shoes_id": best["shoes"].id,
            "score": best["score"],
        },
        "explanation": explanation,
    }


@router.post("/{user_id}/save", response_model=SavedOutfitResponse, status_code=status.HTTP_201_CREATED)
def save_outfit(
    user_id: int,
    outfit_data: SavedOutfitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to save outfits for this user",
        )

    top = (
        db.query(WardrobeItem)
        .filter(WardrobeItem.id == outfit_data.top_id, WardrobeItem.user_id == user_id)
        .first()
    )
    bottom = (
        db.query(WardrobeItem)
        .filter(WardrobeItem.id == outfit_data.bottom_id, WardrobeItem.user_id == user_id)
        .first()
    )
    shoes = (
        db.query(WardrobeItem)
        .filter(WardrobeItem.id == outfit_data.shoes_id, WardrobeItem.user_id == user_id)
        .first()
    )

    if not top or not bottom or not shoes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more wardrobe items not found or do not belong to you",
        )

    existing = (
        db.query(SavedOutfit)
        .filter(
            SavedOutfit.user_id == user_id,
            SavedOutfit.top_id == outfit_data.top_id,
            SavedOutfit.bottom_id == outfit_data.bottom_id,
            SavedOutfit.shoes_id == outfit_data.shoes_id,
            SavedOutfit.occasion == outfit_data.occasion,
        )
        .first()
    )

    if existing:
        return existing

    saved_outfit = SavedOutfit(
        user_id=user_id,
        top_id=outfit_data.top_id,
        bottom_id=outfit_data.bottom_id,
        shoes_id=outfit_data.shoes_id,
        occasion=outfit_data.occasion,
        style_vibe=outfit_data.style_vibe,
        score=outfit_data.score,
        explanation=outfit_data.explanation,
    )

    db.add(saved_outfit)
    db.commit()
    db.refresh(saved_outfit)
    return saved_outfit


@router.get("/{user_id}/saved", response_model=list[SavedOutfitResponse])
def get_saved_outfits(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view saved outfits for this user",
        )

    saved_outfits = (
        db.query(SavedOutfit)
        .filter(SavedOutfit.user_id == user_id)
        .order_by(SavedOutfit.created_at.desc())
        .all()
    )
    return saved_outfits


@router.delete("/saved/{outfit_id}")
def delete_saved_outfit(
    outfit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    outfit = db.query(SavedOutfit).filter(SavedOutfit.id == outfit_id).first()

    if not outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved outfit not found",
        )

    if outfit.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this saved outfit",
        )

    db.delete(outfit)
    db.commit()
    return {"message": "Saved outfit deleted successfully"}
