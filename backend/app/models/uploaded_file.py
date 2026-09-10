from datetime import datetime
from sqlalchemy import Column, String, LargeBinary, DateTime
from app.database import Base


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    filename = Column(String(255), primary_key=True, index=True)
    content_type = Column(String(100), nullable=False)
    file_data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
