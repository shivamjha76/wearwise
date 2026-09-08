from fastapi import APIRouter, Depends, HTTPException
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
    
@router.get("/{user_id}/next-purchase")
def next_purchase(user_id: int, db: Session = Depends(get_db)):

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