import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from app.db.database import Base


class FollowupType(str, enum.Enum):
    APPOINTMENT = "appointment"
    INVESTIGATION = "investigation"
    MEDICATION = "medication"
    PROCEDURE_PREP = "procedure_prep"
    PREGNANCY_TEST = "pregnancy_test"
    FINANCIAL = "financial"
    SUPPORT = "support"
    COUNSELLING = "counselling"


class FollowupStatus(str, enum.Enum):
    PENDING = "pending"
    SCHEDULED = "scheduled"
    SENT = "sent"
    RETRY = "retry"
    RESCHEDULE_REQUESTED = "reschedule_requested"
    SLOT_OFFERED = "slot_offered"
    RESCHEDULED = "rescheduled"
    ESCALATED = "escalated"
    COMPLETED = "completed"
    MISSED = "missed"
    CANCELLED = "cancelled"


class Followup(Base):
    __tablename__ = "followups"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    cycle_id = Column(String(36), ForeignKey("cycles.id", ondelete="SET NULL"), nullable=True, index=True)
    type = Column(
        SQLEnum(FollowupType, values_callable=lambda obj: [e.value for e in obj], native_enum=False),
        nullable=False,
        default=FollowupType.APPOINTMENT
    )
    due_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    status = Column(
        SQLEnum(FollowupStatus, values_callable=lambda obj: [e.value for e in obj], native_enum=False),
        nullable=False,
        default=FollowupStatus.PENDING,
        index=True
    )
    priority_score = Column(Integer, nullable=False, default=1)
    missed_reason = Column(Text, nullable=True)
    ai_metadata = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="followups")
    cycle = relationship("Cycle", back_populates="followups")

    def __repr__(self) -> str:
        return f"<Followup id={self.id} patient_id={self.patient_id} type={self.type} status={self.status} priority={self.priority_score}>"
