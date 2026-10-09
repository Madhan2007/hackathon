from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime
from app.models.cycle import CycleStage, CycleStatus


class CycleBase(BaseModel):
    stage: CycleStage = Field(default=CycleStage.ENQUIRY, description="Current fertility cycle milestone")
    protocol: Optional[str] = Field(default=None, description="Treatment protocol (e.g., Antagonist, agonist, IUI)")
    status: CycleStatus = Field(default=CycleStatus.ACTIVE, description="Cycle status")
    start_date: Optional[datetime] = Field(default_factory=datetime.utcnow, description="Cycle start timestamp")


class CycleCreate(CycleBase):
    pass


class CycleUpdate(BaseModel):
    stage: Optional[CycleStage] = None
    protocol: Optional[str] = None
    status: Optional[CycleStatus] = None
    start_date: Optional[datetime] = None


class CycleEventCreate(BaseModel):
    event_type: str = Field(..., description="Type of clinical or lifecycle event (e.g. STAGE_TRANSITION, MEDICATION_STARTED, SCAN_COMPLETED)")
    new_stage: Optional[CycleStage] = Field(None, description="New cycle stage if this event transitions stage")
    note: Optional[str] = Field(None, description="Clinical or coordinator note")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Custom event metadata / trigger flags")


class CycleRead(CycleBase):
    id: str
    patient_id: str

    model_config = ConfigDict(from_attributes=True)
