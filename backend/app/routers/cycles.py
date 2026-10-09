from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from app.db.database import get_db
from app.models.patient import Patient
from app.models.cycle import Cycle, CycleStage, CycleStatus
from app.models.audit import AuditLog
from app.schemas.cycle import CycleCreate, CycleUpdate, CycleRead, CycleEventCreate

router = APIRouter(tags=["Cycles"])


@router.post("/patients/{patient_id}/cycles", response_model=CycleRead, status_code=status.HTTP_201_CREATED)
def create_patient_cycle(patient_id: str, payload: CycleCreate, db: Session = Depends(get_db)):
    """Create a new treatment cycle for a specific patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found."
        )

    cycle = Cycle(
        id=str(uuid.uuid4()),
        patient_id=patient.id,
        stage=payload.stage,
        protocol=payload.protocol,
        status=payload.status,
        start_date=payload.start_date or datetime.utcnow(),
    )
    db.add(cycle)

    audit = AuditLog(
        action="CREATE_CYCLE",
        table_name="cycles",
        record_id=cycle.id,
        changed_by="coordinator_api",
        changes={
            "patient_id": patient.id,
            "stage": str(cycle.stage.value if hasattr(cycle.stage, 'value') else cycle.stage),
            "protocol": cycle.protocol,
        },
    )
    db.add(audit)

    db.commit()
    db.refresh(cycle)
    return cycle


@router.get("/patients/{patient_id}/cycles", response_model=List[CycleRead])
def list_patient_cycles(patient_id: str, db: Session = Depends(get_db)):
    """List all treatment cycles for a given patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found."
        )
    return patient.cycles


@router.get("/cycles/{id}", response_model=CycleRead)
def get_cycle(id: str, db: Session = Depends(get_db)):
    """Get single cycle by ID."""
    cycle = db.query(Cycle).filter(Cycle.id == id).first()
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cycle with ID '{id}' not found."
        )
    return cycle


@router.patch("/cycles/{id}", response_model=CycleRead)
def update_cycle(id: str, payload: CycleUpdate, db: Session = Depends(get_db)):
    """Update cycle status or stage."""
    cycle = db.query(Cycle).filter(Cycle.id == id).first()
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cycle with ID '{id}' not found."
        )

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        return cycle

    old_stage = str(cycle.stage.value if hasattr(cycle.stage, 'value') else cycle.stage)

    for field, val in update_data.items():
        setattr(cycle, field, val)

    audit = AuditLog(
        action="UPDATE_CYCLE",
        table_name="cycles",
        record_id=cycle.id,
        changed_by="coordinator_api",
        changes={
            "old_stage": old_stage,
            **{k: (v.value if hasattr(v, 'value') else v) for k, v in update_data.items()},
        },
    )
    db.add(audit)

    db.commit()
    db.refresh(cycle)
    return cycle


@router.post("/cycles/{id}/events")
def create_cycle_event(id: str, event: CycleEventCreate, db: Session = Depends(get_db)):
    """
    Record a clinical lifecycle event for a cycle (e.g. STAGE_TRANSITION, EMBRYO_TRANSFERRED, BETA_HCG_ORDERED).
    If a new_stage is provided, automatically updates the cycle stage and registers audit logs.
    """
    cycle = db.query(Cycle).filter(Cycle.id == id).first()
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cycle with ID '{id}' not found."
        )

    previous_stage = str(cycle.stage.value if hasattr(cycle.stage, 'value') else cycle.stage)

    from app.services.stage_rules import StageRulesEngine
    patient = cycle.patient

    # Auto-generate stage-driven follow-ups
    generated_followups = StageRulesEngine.generate_followups_for_event(
        patient=patient,
        cycle=cycle,
        event_type=event.event_type,
        note=event.note,
        custom_metadata=event.metadata,
    )

    for f in generated_followups:
        db.add(f)

    audit = AuditLog(
        action=f"CYCLE_EVENT_{event.event_type.upper()}",
        table_name="cycles",
        record_id=cycle.id,
        changed_by="coordinator_api",
        changes={
            "event_type": event.event_type,
            "previous_stage": previous_stage,
            "new_stage": str(event.new_stage.value if event.new_stage and hasattr(event.new_stage, 'value') else event.new_stage),
            "note": event.note,
            "generated_followups_count": len(generated_followups),
            "metadata": event.metadata,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )
    db.add(audit)

    db.commit()
    db.refresh(cycle)

    return {
        "success": True,
        "message": f"Cycle event '{event.event_type}' recorded successfully. {len(generated_followups)} automated follow-up tasks generated.",
        "cycle_id": cycle.id,
        "patient_id": cycle.patient_id,
        "current_stage": cycle.stage,
        "status": cycle.status,
        "generated_followups_count": len(generated_followups),
        "generated_followups": [
            {
                "id": f.id,
                "type": f.type.value if hasattr(f.type, 'value') else f.type,
                "due_date": f.due_date.isoformat(),
                "priority_score": f.priority_score,
                "ai_metadata": f.ai_metadata,
            }
            for f in generated_followups
        ],
        "event": {
            "event_type": event.event_type,
            "note": event.note,
            "metadata": event.metadata,
            "recorded_at": datetime.utcnow().isoformat(),
        }
    }
