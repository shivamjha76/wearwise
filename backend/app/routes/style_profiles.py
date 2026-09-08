from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.style_profile import StyleProfile
from app.schemas.style_profile import (
    StyleProfileCreate,
    StyleProfileResponse
)


router = APIRouter(
    prefix="/users",
    tags=["Style Profile"]
)


@router.post(
    "/{user_id}/style-profile",
    response_model=StyleProfileResponse
)
def create_style_profile(
    user_id: int,
    profile_data: StyleProfileCreate,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    profile = StyleProfile(
        user_id=user_id,
        height=profile_data.height,
        weight=profile_data.weight,
        skin_tone=profile_data.skin_tone,
        style_preference=profile_data.style_preference,
        fit_preference=profile_data.fit_preference,
        budget=profile_data.budget
    )

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return profile