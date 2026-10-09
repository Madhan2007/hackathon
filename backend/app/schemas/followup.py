from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any, Dict
from datetime import datetime
from app.models.followup import FollowupType, FollowupStatus


class FollowupBase(BaseModel):
    patient_id: str
    cycle_id: Optional[str] = None
    type: FollowupType = Field(default=FollowupType.APPOINTMENT)
    due_date: datetime
    status: FollowupStatus = Field(default=FollowupStatus.PENDING)
    priority_score: int = Field(default=1, ge=1, le=100)
    missed_reason: Optional[str] = None
    ai_metadata: Dict[str, Any] = Field(default_factory=dict)


class FollowupCreate(FollowupBase):
    pass


class FollowupUpdate(BaseModel):
    type: Optional[FollowupType] = None
    due_date: Optional[datetime] = None
    status: Optional[FollowupStatus] = None
    priority_score: Optional[int] = Field(None, ge=1, le=100)
    missed_reason: Optional[str] = None
    ai_metadata: Optional[Dict[str, Any]] = None


class FollowupRead(FollowupBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
