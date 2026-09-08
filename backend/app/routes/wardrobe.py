from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.wardrobe import WardrobeItem
from app.schemas.wardrobe import (
    WardrobeItemCreate,
    WardrobeItemResponse
)


router = APIRouter(
    prefix="/wardrobe",
    tags=["Wardrobe"]
)


@router.post(
    "/{user_id}",
    response_model=WardrobeItemResponse
)
def add_wardrobe_item(
    user_id: int,
    item_data: WardrobeItemCreate,
    db: Session = Depends(get_db)
):
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
        style=item_data.style
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
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):
    item = (
        db.query(WardrobeItem)
        .filter(WardrobeItem.id == item_id)
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Wardrobe item not found"
        )

    db.delete(item)
    db.commit()

    return {
        "message": "Wardrobe item deleted successfully"
    }