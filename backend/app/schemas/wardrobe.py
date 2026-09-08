from pydantic import BaseModel


class WardrobeItemCreate(BaseModel):
    category: str
    color: str
    fit: str | None = None
    pattern: str | None = None
    style: str | None = None


class WardrobeItemResponse(BaseModel):
    id: int
    user_id: int
    category: str
    color: str
    fit: str | None
    pattern: str | None
    style: str | None

    class Config:
        from_attributes = True