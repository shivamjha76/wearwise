from pydantic import BaseModel


class StyleProfileCreate(BaseModel):
    height: float
    weight: float
    skin_tone: str | None = None
    style_preference: str
    fit_preference: str
    budget: float


class StyleProfileResponse(BaseModel):
    id: int
    user_id: int
    height: float
    weight: float
    skin_tone: str | None = None
    style_preference: str
    fit_preference: str
    budget: float

    class Config:
        from_attributes = True