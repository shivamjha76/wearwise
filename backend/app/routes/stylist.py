from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.style_profile import StyleProfile
from app.models.wardrobe import WardrobeItem
from app.schemas.stylist import StylistChatRequest, StylistChatResponse, SetApiKeyRequest
from app.services.stylist import get_stylist_reply, get_active_engine_info, save_api_key
from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/stylist",
    tags=["AI Stylist"]
)


@router.get("/status")
def stylist_status():
    """Returns active AI engine status (Gemini, OpenAI, Groq, or built-in AI Engine)."""
    return get_active_engine_info()


@router.post("/api-key")
def update_stylist_api_key(
    request: SetApiKeyRequest,
    current_user: User = Depends(get_current_user)
):
    """Dynamically sets and persists Gemini, OpenAI, or Groq API key."""
    if not request.api_key.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API Key cannot be empty"
        )
    try:
        updated_info = save_api_key(request.provider, request.api_key)
        return updated_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )



@router.post("/chat", response_model=StylistChatResponse)
def chat_with_stylist(
    request: StylistChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty"
        )

    # Fetch user's style profile
    profile = db.query(StyleProfile).filter(StyleProfile.user_id == current_user.id).first()

    # Fetch user's wardrobe items
    wardrobe_items = db.query(WardrobeItem).filter(WardrobeItem.user_id == current_user.id).all()

    # Convert history
    history_dicts = [{"role": h.role, "content": h.content} for h in request.history]

    reply, recommended_items, occasion, engine = get_stylist_reply(
        user=current_user,
        profile=profile,
        wardrobe_items=wardrobe_items,
        message=request.message,
        history=history_dicts
    )

    return {
        "reply": reply,
        "recommended_items": recommended_items,
        "occasion": occasion,
        "engine": engine
    }

