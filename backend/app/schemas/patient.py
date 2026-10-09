from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class PatientBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Full patient or couple name")
    phone: str = Field(..., min_length=8, max_length=32, description="E.164 or 10-digit phone number")
    language: str = Field(default="ta", description="Preferred language code: 'ta' (Tamil) or 'en' (English)")
    district: str = Field(default="Chennai", description="District in Tamil Nadu")
    privacy_mode: bool = Field(default=False, description="Discreet masking mode for sensitive notifications")
    consent_status: bool = Field(default=True, description="WhatsApp & SMS opt-in consent")


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, min_length=8, max_length=32)
    language: Optional[str] = None
    district: Optional[str] = None
    privacy_mode: Optional[bool] = None
    consent_status: Optional[bool] = None


class CycleSummary(BaseModel):
    id: str
    stage: str
    protocol: Optional[str] = None
    status: str
    start_date: datetime

    model_config = ConfigDict(from_attributes=True)


class FollowupSummary(BaseModel):
    id: str
    type: str
    due_date: datetime
    status: str
    priority_score: int
    missed_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PatientRead(PatientBase):
    id: str
    created_at: datetime
    cycles: List[CycleSummary] = []
    followups: List[FollowupSummary] = []

    model_config = ConfigDict(from_attributes=True)
