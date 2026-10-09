from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.patient import Patient
from app.models.followup import Followup
from app.schemas.ai_intent import WebhookMessagePayload, PatientIntent
from app.services.ai_engine import AIEngineService
from app.services.workflow_router import WorkflowRouter

router = APIRouter(prefix="/webhooks", tags=["Webhooks & AI Simulator"])


@router.post("/whatsapp")
def handle_inbound_whatsapp(payload: WebhookMessagePayload, db: Session = Depends(get_db)):
    """
    Inbound patient message webhook handler (WhatsApp / SMS / Simulator):
    1. Identifies patient by phone number or ID.
    2. Uses Gemini NLU / Deterministic Parser to extract structured PatientIntent.
    3. Validates and routes intent through Clinical State Machine.
    4. Returns AI response and updated clinical follow-up state.
    """
    patient = None
    if payload.patient_id:
        patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()

    if not patient and payload.phone:
        patient = db.query(Patient).filter(Patient.phone == payload.phone).first()

    if not patient:
        # Check matching last 10 digits
        clean_phone = payload.phone.replace("+91", "").replace(" ", "").strip()
        patient = db.query(Patient).filter(Patient.phone.like(f"%{clean_phone}%")).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No patient profile found associated with phone '{payload.phone}'."
        )

    followup = None
    if payload.followup_id:
        followup = db.query(Followup).filter(Followup.id == payload.followup_id).first()

    # 1. AI Intent Extraction (Gemini LLM / Fallback with context)
    current_status = followup.status.value if (followup and hasattr(followup.status, 'value')) else (str(followup.status) if followup else None)
    parsed_intent: PatientIntent = AIEngineService.parse_intent(
        message_text=payload.message,
        attachment_type=payload.attachment_type,
        attachment_data=payload.attachment_data,
        current_followup_status=current_status,
    )

    # 2. State Machine Routing & Action Execution
    result = WorkflowRouter.handle_intent(
        db=db,
        patient=patient,
        followup=followup,
        parsed_intent=parsed_intent,
    )

    return {
        "success": True,
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "district": patient.district,
            "language": patient.language,
        },
        "intent_analysis": parsed_intent.model_dump(),
        "workflow_action": result["action_taken"],
        "followup_id": result["followup_id"],
        "new_status": result["new_status"],
        "due_date": result.get("due_date"),
        "priority_score": result.get("priority_score"),
        "reply_message": result["response_message"],
    }
