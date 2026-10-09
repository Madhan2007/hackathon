import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.db.database import Base


class CycleStage(str, enum.Enum):
    ENQUIRY = "enquiry"
    CONSULTATION = "consultation"
    INVESTIGATION = "investigation"
    DIAGNOSIS = "diagnosis"
    TREATMENT_DECISION = "treatment_decision"
    IUI_PREP = "iui_prep"
    IVF_STIMULATION = "ivf_stimulation"
    EGG_RETRIEVAL = "egg_retrieval"
    EMBRYO_TRANSFER = "embryo_transfer"
    POST_TRANSFER = "post_transfer"
    BETA_HCG = "beta_hcg"
    OUTCOME = "outcome"


class CycleStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class Cycle(Base):
    __tablename__ = "cycles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    stage = Column(
        SQLEnum(CycleStage, values_callable=lambda obj: [e.value for e in obj], native_enum=False),
        nullable=False,
        default=CycleStage.ENQUIRY
    )
    protocol = Column(String(255), nullable=True)
    status = Column(
        SQLEnum(CycleStatus, values_callable=lambda obj: [e.value for e in obj], native_enum=False),
        nullable=False,
        default=CycleStatus.ACTIVE
    )
    start_date = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="cycles")
    followups = relationship("Followup", back_populates="cycle", cascade="all, delete-orphan", order_by="desc(Followup.due_date)")

    def __repr__(self) -> str:
        return f"<Cycle id={self.id} patient_id={self.patient_id} stage={self.stage} status={self.status}>"
