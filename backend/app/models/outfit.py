from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class SavedOutfit(Base):
    __tablename__ = "saved_outfits"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    top_id = Column(
        Integer,
        ForeignKey("wardrobe_items.id", ondelete="CASCADE"),
        nullable=False
    )

    bottom_id = Column(
        Integer,
        ForeignKey("wardrobe_items.id", ondelete="CASCADE"),
        nullable=False
    )

    shoes_id = Column(
        Integer,
        ForeignKey("wardrobe_items.id", ondelete="CASCADE"),
        nullable=False
    )

    occasion = Column(String(50), nullable=False)
    style_vibe = Column(String(50), nullable=True)
    score = Column(Integer, nullable=True)
    explanation = Column(String(1000), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User", backref="saved_outfits")
    top = relationship("WardrobeItem", foreign_keys=[top_id])
    bottom = relationship("WardrobeItem", foreign_keys=[bottom_id])
    shoes = relationship("WardrobeItem", foreign_keys=[shoes_id])
