from pydantic import BaseModel


class StyleProfileCreate(BaseModel):
    height: float | None = None
    weight: float | None = None
    gender: str | None = None
    skin_tone: str | None = None
    style_preference: str | None = "casual"
    fit_preference: str | None = "regular"
    budget: float | None = None


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

    class Config:
        from_attributes = True