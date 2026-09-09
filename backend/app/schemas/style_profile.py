from pydantic import BaseModel


class StyleProfileCreate(BaseModel):
    height: float | None = None
    weight: float | None = None
    gender: str | None = None
    skin_tone: str | None = None
    style_preference: str | None = "casual"
    fit_preference: str | None = "regular"
    budget: float | None = None
    chest_bust: str | None = None
    waist_size: str | None = None
    hip_size: str | None = None
    top_size: str | None = None
    bottom_size: str | None = None
    shoe_size: str | None = None


class StyleProfileResponse(BaseModel):
    id: int
    user_id: int
    height: float | None = None
    weight: float | None = None
    gender: str | None = None
    skin_tone: str | None = None
    style_preference: str | None = None
    fit_preference: str | None = None
    budget: float | None = None
    chest_bust: str | None = None
    waist_size: str | None = None
    hip_size: str | None = None
    top_size: str | None = None
    bottom_size: str | None = None
    shoe_size: str | None = None

    class Config:
        from_attributes = True