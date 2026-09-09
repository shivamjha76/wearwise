from sqlalchemy import Column, Integer, String, ForeignKey
from app.database import Base


class WardrobeItem(Base):
    __tablename__ = "wardrobe_items"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    category = Column(String(50), nullable=False)
    color = Column(String(50), nullable=False)
    fit = Column(String(50))
    pattern = Column(String(50))
    style = Column(String(50))

    # Optional clothing image URL
    image_url = Column(String(500))