from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.patient import Patient
from app.models.followup import Followup
from app.schemas.ai_intent import WebhookMessagePayload, PatientIntent
from app.services.ai_engine import AIEngineService
from app.services.workflow_router import WorkflowRouter

router = APIRouter(prefix="/webhooks", tags=["Webhooks & AI Simulator"])


from fastapi import Request, Response
from urllib.parse import parse_qs

@router.post("/whatsapp")
async def handle_inbound_whatsapp(request: Request, db: Session = Depends(get_db)):
    """
    Inbound patient message webhook handler (WhatsApp / Twilio / SMS / Simulator):
    1. Supports Twilio Form webhook (x-www-form-urlencoded) and JSON API payloads.
    2. Identifies patient by phone number or ID.
    3. Uses Gemini NLU / Deterministic Parser to extract structured PatientIntent.
    4. Validates and routes intent through Clinical State Machine.
    5. Returns TwiML XML response for Twilio, or JSON for Simulator.
    """
    content_type = request.headers.get("content-type", "")
    is_twilio = "application/x-www-form-urlencoded" in content_type

    if is_twilio:
        raw_body = await request.body()
        form_data = parse_qs(raw_body.decode("utf-8"))
        raw_from = form_data.get("From", [""])[0]
        phone = raw_from.replace("whatsapp:", "").strip()
        message = form_data.get("Body", [""])[0].strip()
        patient_id = None
        followup_id = None
        attachment_type = None
        attachment_data = None
    else:
        json_data = await request.json()
        payload = WebhookMessagePayload(**json_data)
        phone = payload.phone
        patient_id = payload.patient_id
        followup_id = payload.followup_id
        message = payload.message
        attachment_type = payload.attachment_type
        attachment_data = payload.attachment_data

    patient = None
    if patient_id:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()

    if not patient and phone:
        patient = db.query(Patient).filter(Patient.phone == phone).first()

    if not patient and phone:
        # Check matching last 10 digits
        clean_phone = phone.replace("+91", "").replace(" ", "").replace("-", "").strip()
        patient = db.query(Patient).filter(Patient.phone.like(f"%{clean_phone}%")).first()

    if not patient:
        if is_twilio:
            not_found_msg = "Hello! Your phone number is not registered with FertiFlow AI Clinic. Please contact our front desk."
            return Response(
                content=f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{not_found_msg}</Message></Response>',
                media_type="application/xml",
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No patient profile found associated with phone '{phone}'."
        )

    followup = None
    if followup_id:
        followup = db.query(Followup).filter(Followup.id == followup_id).first()
    elif patient:
        # Find the most urgent or recent active follow-up for this patient
        followup = (
            db.query(Followup)
            .filter(Followup.patient_id == patient.id)
            .order_by(Followup.priority_score.desc(), Followup.due_date.asc())
            .first()
        )

    # 1. AI Intent Extraction (Gemini LLM / Fallback with context)
    current_status = followup.status.value if (followup and hasattr(followup.status, 'value')) else (str(followup.status) if followup else None)
    parsed_intent: PatientIntent = AIEngineService.parse_intent(
        message_text=message,
        attachment_type=attachment_type,
        attachment_data=attachment_data,
        current_followup_status=current_status,
    )

    # 2. State Machine Routing & Action Execution
    result = WorkflowRouter.handle_intent(
        db=db,
        patient=patient,
        followup=followup,
        parsed_intent=parsed_intent,
    )

    if is_twilio:
        reply_text = result.get("response_message", "FertiFlow reminder received.")
        twiml_xml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{reply_text}</Message></Response>'
        return Response(content=twiml_xml, media_type="application/xml")

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
