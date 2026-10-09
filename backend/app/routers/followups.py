from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from app.db.database import get_db
from app.models.patient import Patient
from app.models.cycle import Cycle
from app.models.followup import Followup, FollowupStatus, FollowupType
from app.models.audit import AuditLog
from app.schemas.followup import FollowupCreate, FollowupUpdate, FollowupRead

router = APIRouter(prefix="/followups", tags=["Follow-ups"])


@router.post("/", response_model=FollowupRead, status_code=status.HTTP_201_CREATED)
def create_followup(payload: FollowupCreate, db: Session = Depends(get_db)):
    """Create a new follow-up task for a patient."""
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{payload.patient_id}' not found."
        )

    if payload.cycle_id:
        cycle = db.query(Cycle).filter(Cycle.id == payload.cycle_id).first()
        if not cycle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cycle with ID '{payload.cycle_id}' not found."
            )

    followup = Followup(
        id=str(uuid.uuid4()),
        patient_id=payload.patient_id,
        cycle_id=payload.cycle_id,
        type=payload.type,
        due_date=payload.due_date,
        status=payload.status,
        priority_score=payload.priority_score,
        missed_reason=payload.missed_reason,
        ai_metadata=payload.ai_metadata or {},
    )
    db.add(followup)

    audit = AuditLog(
        action="CREATE_FOLLOWUP",
        table_name="followups",
        record_id=followup.id,
        changed_by="coordinator_api",
        changes={"patient_id": followup.patient_id, "type": str(followup.type), "priority": followup.priority_score},
    )
    db.add(audit)

    db.commit()
    db.refresh(followup)
    return followup


@router.get("/", response_model=List[FollowupRead])
def list_followups(
    status_filter: Optional[FollowupStatus] = Query(None, alias="status"),
    type_filter: Optional[FollowupType] = Query(None, alias="type"),
    patient_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List follow-ups ordered by priority and due date."""
    query = db.query(Followup)
    if status_filter:
        query = query.filter(Followup.status == status_filter)
    if type_filter:
        query = query.filter(Followup.type == type_filter)
    if patient_id:
        query = query.filter(Followup.patient_id == patient_id)

    return query.order_by(Followup.priority_score.desc(), Followup.due_date.asc()).limit(limit).all()


@router.patch("/{id}", response_model=FollowupRead)
def update_followup(id: str, payload: FollowupUpdate, db: Session = Depends(get_db)):
    """Update follow-up status (e.g., sent, rescheduled, missed, completed)."""
    followup = db.query(Followup).filter(Followup.id == id).first()
    if not followup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Follow-up with ID '{id}' not found."
        )

    from app.services.followup import FollowupStateMachine
    from app.services.priority import PriorityScorer

    update_data = payload.model_dump(exclude_unset=True)

    if "status" in update_data and update_data["status"] != followup.status:
        new_stat = update_data.pop("status")
        reason = update_data.get("missed_reason", followup.missed_reason)
        followup = FollowupStateMachine.transition(
            db=db,
            followup=followup,
            new_status=new_stat,
            changed_by="coordinator_api",
            reason=reason,
            additional_metadata=update_data.get("ai_metadata"),
        )

    for field, val in update_data.items():
        setattr(followup, field, val)

    # Re-evaluate priority score if due_date or missed_reason changed
    cycle_stage = followup.cycle.stage if followup.cycle else None
    followup.priority_score = PriorityScorer.calculate_score(
        followup_type=followup.type,
        due_date=followup.due_date,
        cycle_stage=cycle_stage,
        status=followup.status,
        has_missed_reason=bool(followup.missed_reason),
    )

    db.commit()
    db.refresh(followup)
    return followup


@router.post("/{id}/call")
def trigger_voice_call(id: str, db: Session = Depends(get_db)):
    """Trigger real automated cellular phone call to patient's SIM card via Exotel / n8n."""
    followup = db.query(Followup).filter(Followup.id == id).first()
    if not followup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Follow-up with ID '{id}' not found."
        )

    patient = followup.patient
    if not patient or not patient.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient does not have a valid mobile phone number."
        )

    from app.services.exotel_service import ExotelVoiceService
    stage = followup.cycle.stage if followup.cycle else "IVF Care"
    tam_msg = followup.ai_metadata.get("tam_message", "உங்கள் IVF மருத்துவ நினைவூட்டல்.") if followup.ai_metadata else "உங்கள் IVF மருந்தை தவறாமல் எடுத்துக்கொள்ளவும்."
    eng_msg = followup.ai_metadata.get("eng_message", "Your clinical medication reminder.") if followup.ai_metadata else "Please take your scheduled medication."

    call_result = ExotelVoiceService.initiate_patient_call(
        patient_phone=patient.phone,
        patient_name=patient.name,
        tamil_message=tam_msg,
        english_message=eng_msg,
        followup_id=followup.id,
        stage=stage,
    )

    return {
        "status": "success",
        "patient": patient.name,
        "phone": patient.phone,
        "result": call_result,
    }
