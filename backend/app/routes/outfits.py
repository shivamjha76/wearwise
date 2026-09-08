from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.style_profile import StyleProfile
from app.models.wardrobe import WardrobeItem
from app.services.recommendation import generate_outfits


router = APIRouter(
    prefix="/outfits",
    tags=["Outfits"]
)


@router.post("/{user_id}")
def recommend_outfits(
    user_id: int,
    occasion: str,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    profile = (
        db.query(StyleProfile)
        .filter(StyleProfile.user_id == user_id)
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Style profile not found"
        )

    wardrobe = (
        db.query(WardrobeItem)
        .filter(WardrobeItem.user_id == user_id)
        .all()
    )

    if not wardrobe:
        raise HTTPException(
            status_code=400,
            detail="Wardrobe is empty"
        )

    outfits = generate_outfits(
        wardrobe,
        profile,
        occasion
    )

    if not outfits:
        raise HTTPException(
            status_code=400,
            detail="Not enough wardrobe items to generate an outfit"
        )

    return {
        "user_id": user_id,
        "occasion": occasion,
        "recommendations": [
            {
                "top": outfit["top"].id,
                "bottom": outfit["bottom"].id,
                "shoes": outfit["shoes"].id,
                "score": outfit["score"]
            }
            for outfit in outfits
        ]
    }