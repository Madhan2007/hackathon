from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import uuid

from app.models.patient import Patient
from app.models.followup import Followup, FollowupStatus
from app.models.appointment import Appointment
from app.services.reminders import ReminderService
from app.services.audit import AuditService


class RescheduleTransactionEngine:
    @classmethod
    def execute_atomic_reschedule(
        cls,
        db: Session,
        followup_id: str,
        target_slot_datetime: datetime,
        reason: str = "Patient requested reschedule",
        doctor_name: str = "Dr. Subha Fertility Specialist",
        changed_by: str = "coordinator",
    ) -> Dict[str, Any]:
        """
        Executes atomic reschedule transaction:
        1. Validates follow-up
        2. Creates new appointment
        3. Updates prior appointments to 'rescheduled'
        4. Synchronizes reminder schedules & AI templates
        5. Logs immutable audit event
        """
        followup = db.query(Followup).filter(Followup.id == followup_id).first()
        if not followup:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Follow-up with ID '{followup_id}' not found."
            )

        patient = followup.patient

        # 1. Update any existing active appointment for this follow-up
        existing_appts = (
            db.query(Appointment)
            .filter(
                Appointment.followup_id == followup.id,
                Appointment.status == "scheduled",
            )
            .all()
        )
        for appt in existing_appts:
            appt.status = "rescheduled"

        # 2. Create new scheduled appointment
        new_appointment = Appointment(
            id=str(uuid.uuid4()),
            followup_id=followup.id,
            patient_id=patient.id,
            doctor_name=doctor_name,
            datetime=target_slot_datetime,
            duration_min=30,
            status="scheduled",
            location="Main Clinic Hub - Room 2",
            notes=f"Rescheduled: {reason}",
        )
        db.add(new_appointment)

        # 3. Synchronize reminder chain and update followup due date
        ReminderService.sync_rescheduled_reminders(
            db=db,
            patient=patient,
            followup=followup,
            new_appointment_dt=target_slot_datetime,
            changed_by=changed_by,
        )

        # 4. Log Audit Event
        AuditService.log_event(
            db=db,
            action="ATOMIC_RESCHEDULE_COMPLETED",
            table_name="appointments",
            record_id=new_appointment.id,
            changed_by=changed_by,
            changes={
                "followup_id": followup.id,
                "patient_id": patient.id,
                "new_datetime": target_slot_datetime.isoformat(),
                "reason": reason,
                "doctor": doctor_name,
            },
        )

        db.commit()

        return {
            "success": True,
            "message": f"Follow-up successfully rescheduled to {target_slot_datetime.strftime('%A, %d-%b-%Y at %I:%M %p')}.",
            "appointment_id": new_appointment.id,
            "followup_id": followup.id,
            "patient_id": patient.id,
            "patient_name": patient.name,
            "new_datetime": target_slot_datetime.isoformat(),
            "formatted_datetime": target_slot_datetime.strftime("%A, %d-%b-%Y at %I:%M %p"),
            "doctor": doctor_name,
            "followup_status": followup.status.value if hasattr(followup.status, 'value') else followup.status,
        }
