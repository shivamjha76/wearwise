from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    avatar_url: str | None = None
    skin_tone: str | None = None

    class Config:
        from_attributes = True