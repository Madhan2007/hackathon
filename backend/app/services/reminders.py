from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
import uuid

from app.models.patient import Patient
from app.models.followup import Followup, FollowupStatus, FollowupType
from app.services.audit import AuditService
from app.templates.messages import render_message


class ReminderService:
    @classmethod
    def sync_rescheduled_reminders(
        cls,
        db: Session,
        patient: Patient,
        followup: Followup,
        new_appointment_dt: datetime,
        changed_by: str = "coordinator",
    ) -> Followup:
        """
        Cancels stale reminders and synchronizes new reminder schedules for the rescheduled appointment.
        """
        # 1. Update the follow-up due date
        old_due = followup.due_date
        followup.due_date = new_appointment_dt
        followup.status = FollowupStatus.SCHEDULED

        lang = patient.language or "ta"
        date_str = new_appointment_dt.strftime("%A, %d-%b-%Y at %I:%M %p")

        # 2. Update AI metadata with new customized reminder messages
        tam_msg = f"வணக்கம் {patient.name}, உங்கள் சந்திப்பு மாற்றப்பட்டு {date_str} அன்று உறுதி செய்யப்பட்டுள்ளது."
        eng_msg = f"Dear {patient.name}, your rescheduled appointment is confirmed for {date_str}."

        meta = dict(followup.ai_metadata or {})
        meta.update({
            "rescheduled_at": datetime.utcnow().isoformat(),
            "previous_due_date": old_due.isoformat(),
            "tam_message": tam_msg,
            "eng_message": eng_msg,
        })
        followup.ai_metadata = meta

        # 3. Log Audit
        AuditService.log_event(
            db=db,
            action="REMINDER_RESCHEDULED",
            table_name="followups",
            record_id=followup.id,
            changed_by=changed_by,
            changes={
                "old_due_date": old_due.isoformat(),
                "new_due_date": new_appointment_dt.isoformat(),
                "patient_id": patient.id,
            },
        )

        db.commit()
        db.refresh(followup)
        return followup
