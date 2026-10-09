import uuid
from datetime import datetime as dt_module
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    followup_id = Column(String(36), ForeignKey("followups.id", ondelete="SET NULL"), nullable=True, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_name = Column(String(255), nullable=False, default="Dr. Subha Fertility Specialist")
    datetime = Column(DateTime, nullable=False)
    duration_min = Column(Integer, nullable=False, default=30)
    status = Column(String(50), nullable=False, default="scheduled")  # scheduled, rescheduled, completed, cancelled
    location = Column(String(255), nullable=False, default="Main Clinic Hub - Consultation Room 2")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=dt_module.utcnow)

    # Relationships
    patient = relationship("Patient")
    followup = relationship("Followup")

    def __repr__(self) -> str:
        return f"<Appointment id={self.id} patient_id={self.patient_id} datetime={self.datetime} status={self.status}>"
