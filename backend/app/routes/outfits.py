from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.style_profile import StyleProfile
from app.models.wardrobe import WardrobeItem
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
