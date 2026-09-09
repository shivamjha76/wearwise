from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.style_profile import StyleProfile
from app.schemas.style_profile import (
    StyleProfileCreate,
    StyleProfileResponse
)
from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/users",
    tags=["Style Profile"]
)


@router.get(
    "/{user_id}/style-profile",
    response_model=StyleProfileResponse
)
def get_style_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this style profile"
        )

    profile = db.query(StyleProfile).filter(StyleProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Style profile not found"
        )
    return profile


@router.post(
    "/{user_id}/style-profile",
    response_model=StyleProfileResponse
)
def create_or_update_style_profile(
    user_id: int,
    profile_data: StyleProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this style profile"
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    profile = db.query(StyleProfile).filter(StyleProfile.user_id == user_id).first()

    if profile:
        profile.height = profile_data.height
        profile.weight = profile_data.weight
        if profile_data.gender is not None:
            profile.gender = profile_data.gender
        if profile_data.skin_tone is not None:
            profile.skin_tone = profile_data.skin_tone
        if profile_data.style_preference is not None:
            profile.style_preference = profile_data.style_preference
        if profile_data.fit_preference is not None:
            profile.fit_preference = profile_data.fit_preference
        if profile_data.budget is not None:
            profile.budget = profile_data.budget
    else:
        profile = StyleProfile(
            user_id=user_id,
            height=profile_data.height,
            weight=profile_data.weight,
            gender=profile_data.gender,
            skin_tone=profile_data.skin_tone,
            style_preference=profile_data.style_preference or "casual",
            fit_preference=profile_data.fit_preference or "regular",
            budget=profile_data.budget
        )
        db.add(profile)

    db.commit()
    db.refresh(profile)

    return profile