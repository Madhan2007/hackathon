import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    phone = Column(String(32), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=True, default=None)
    language = Column(String(10), nullable=False, default="ta")  # "ta" (Tamil) or "en" (English)
    district = Column(String(100), nullable=False, default="Chennai")
    privacy_mode = Column(Boolean, nullable=False, default=False)
    consent_status = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    cycles = relationship("Cycle", back_populates="patient", cascade="all, delete-orphan", order_by="desc(Cycle.start_date)")
    followups = relationship("Followup", back_populates="patient", cascade="all, delete-orphan", order_by="desc(Followup.due_date)")

    def __repr__(self) -> str:
        return f"<Patient id={self.id} name={self.name} phone={self.phone} district={self.district}>"
