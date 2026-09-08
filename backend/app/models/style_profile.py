from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class StyleProfile(Base):
    __tablename__ = "style_profiles"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False
    )

    height = Column(Float)
    weight = Column(Float)
    skin_tone = Column(String(50))
    style_preference = Column(String(100))
    fit_preference = Column(String(50))
    budget = Column(Float)

    user = relationship("User", backref="style_profile")