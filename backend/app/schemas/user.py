from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr


class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None = None
    avatar_url: str | None = None
    skin_tone: str | None = None
    gender: str | None = None

    class Config:
        from_attributes = True