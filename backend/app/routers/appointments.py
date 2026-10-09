from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.database import get_db
from app.models.appointment import Appointment
from app.models.patient import Patient
from app.schemas.appointment import SlotOption, AppointmentRead, AppointmentCreate, RescheduleRequest
from app.services.scheduling import SchedulingService
from app.services.reschedule import RescheduleTransactionEngine

router = APIRouter(prefix="/appointments", tags=["Appointments & Scheduling"])


@router.get("/slots", response_model=List[SlotOption])
def discover_slots(
    preferred_day: Optional[str] = Query(None, description="Preferred day (e.g., Monday, tomorrow)"),
    preferred_period: Optional[str] = Query(None, description="Preferred period: MORNING, AFTERNOON, EVENING"),
    days_ahead: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
):
    """Discover available clinic appointment slots ranked by availability and patient preference."""
    slots = SchedulingService.discover_available_slots(
        db=db,
        preferred_day=preferred_day,
        preferred_period=preferred_period,
        days_ahead=days_ahead,
    )
    return slots


@router.post("/reschedule")
def reschedule_appointment(payload: RescheduleRequest, db: Session = Depends(get_db)):
    """Execute atomic appointment rescheduling with reminder synchronization and audit logging."""
    result = RescheduleTransactionEngine.execute_atomic_reschedule(
        db=db,
        followup_id=payload.followup_id,
        target_slot_datetime=payload.target_slot_datetime,
        reason=payload.reason or "Patient requested reschedule",
        doctor_name=payload.doctor_name or "Dr. Subha Fertility Specialist",
        changed_by=payload.changed_by,
    )
    return result


@router.get("/", response_model=List[AppointmentRead])
def list_appointments(
    patient_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    """List appointments sorted by date."""
    query = db.query(Appointment)
    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)
    if status_filter:
        query = query.filter(Appointment.status == status_filter)
    return query.order_by(Appointment.datetime.asc()).all()
