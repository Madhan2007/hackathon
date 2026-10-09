from pydantic import BaseModel, Field
from typing import Literal, Optional, Dict, Any


class PatientIntent(BaseModel):
    intent: Literal[
        "CONFIRM",
        "RESCHEDULE",
        "CANCEL",
        "SLOT_SELECTED",
        "MEDICAL_QUESTION",
        "FINANCIAL_ISSUE",
        "LAB_REPORT_RECEIVED",
        "NEED_HELP",
        "ESCALATE",
        "UNCLEAR"
    ] = Field(description="Classified patient intent")
    preferred_day: Optional[str] = Field(None, description="Requested day if rescheduling (e.g., Monday, tomorrow, 15th)")
    preferred_period: Optional[Literal["MORNING", "AFTERNOON", "EVENING"]] = Field(
        None, description="Preferred time slot of the day"
    )
    selected_slot_index: Optional[int] = Field(None, description="Index of selected slot (1, 2, or 3) if choosing from offered options")
    patient_reason: Optional[str] = Field(
        None, description="Reason extracted from patient message (e.g., travel delay, cost, stomach pain)"
    )
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0, description="Confidence score of classification")
    language_detected: Literal["ta", "en", "mixed"] = Field(default="ta", description="Detected language of inbound text")
    lab_result_data: Optional[Dict[str, Any]] = Field(None, description="Structured lab test or report findings if attached")


class WebhookMessagePayload(BaseModel):
    phone: str = Field(..., description="Sender phone number")
    message: str = Field(..., description="Message text in Tamil, English, or Tanglish")
    channel: str = Field(default="whatsapp", description="Communication channel: whatsapp, sms, web")
    patient_id: Optional[str] = Field(None, description="Optional patient ID if known")
    followup_id: Optional[str] = Field(None, description="Associated follow-up ID if responding to specific prompt")
    attachment_type: Optional[str] = Field(None, description="Type of attachment: voice_note, lab_report, test_kit_image")
    attachment_data: Optional[Dict[str, Any]] = Field(None, description="Metadata or parameters for simulated media")
