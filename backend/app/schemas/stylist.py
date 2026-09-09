from typing import List, Optional
from pydantic import BaseModel
from app.schemas.wardrobe import WardrobeItemResponse


class ChatHistoryItem(BaseModel):
    role: str
    content: str


class StylistChatRequest(BaseModel):
    message: str
    history: List[ChatHistoryItem] = []


class StylistChatResponse(BaseModel):
    reply: str
    recommended_items: List[WardrobeItemResponse] = []
    occasion: Optional[str] = None
    engine: Optional[str] = None


class SetApiKeyRequest(BaseModel):
    provider: str  # "gemini", "openai", "groq"
    api_key: str

