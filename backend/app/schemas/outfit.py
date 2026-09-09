from datetime import datetime
from pydantic import BaseModel
from app.schemas.wardrobe import WardrobeItemResponse


class SavedOutfitCreate(BaseModel):
    top_id: int
    bottom_id: int
    shoes_id: int
    occasion: str
    style_vibe: str | None = None
    score: int | None = None
    explanation: str | None = None


class SavedOutfitResponse(BaseModel):
    id: int
    user_id: int
    top_id: int
    bottom_id: int
    shoes_id: int
    occasion: str
    style_vibe: str | None = None
    score: int | None = None
    explanation: str | None = None
    created_at: datetime
    top: WardrobeItemResponse | None = None
    bottom: WardrobeItemResponse | None = None
    shoes: WardrobeItemResponse | None = None

    class Config:
        from_attributes = True
