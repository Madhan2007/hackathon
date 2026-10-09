from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class SlotOption(BaseModel):
    slot_id: str
    datetime: datetime
    formatted_date: str
    formatted_time: str
    period: str  # MORNING, AFTERNOON, EVENING
    doctor_name: str
    available: bool = True
    location: str


class AppointmentBase(BaseModel):
    patient_id: str
    followup_id: Optional[str] = None
    datetime: datetime
    doctor_name: str = Field(default="Dr. Subha Fertility Specialist")
    duration_min: int = Field(default=30)
    status: str = Field(default="scheduled")
    location: str = Field(default="Main Clinic Hub - Consultation Room 2")
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentRead(AppointmentBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RescheduleRequest(BaseModel):
    followup_id: str
    target_slot_datetime: datetime
    reason: Optional[str] = Field(default="Patient requested reschedule")
    doctor_name: Optional[str] = Field(default="Dr. Subha Fertility Specialist")
    changed_by: str = Field(default="coordinator")
