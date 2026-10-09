from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
import uuid

from app.models.followup import Followup, FollowupStatus
from app.models.patient import Patient
from app.services.followup import FollowupStateMachine
from app.services.audit import AuditService


class EscalationEngine:
    """
    SLA and Rule-driven Escalation Engine.
    Routes complex, clinical, financial, or unconfirmed patient cases to the appropriate care staff.
    """

    # SLA and Role Assignment Rules
    ESCALATION_RULES = {
        "MEDICAL_QUESTION": {
            "level": "L3",
            "assigned_role": "Duty Nurse & Doctor",
            "sla_hours": 4,
            "priority_boost": 25,
            "description": "Reported medical symptoms or medication inquiry requiring clinical review",
        },
        "FINANCIAL_CONCERN": {
            "level": "L2",
            "assigned_role": "Financial Counsellor & Clinic Admin",
            "sla_hours": 24,
            "priority_boost": 15,
            "description": "Patient inquired about cost, package pricing, or EMI options",
        },
        "NO_RESPONSE_ATTEMPTS": {
            "level": "L1",
            "assigned_role": "Patient Care Coordinator",
            "sla_hours": 24,
            "priority_boost": 10,
            "description": "Multiple unacknowledged reminder attempts exceeded",
        },
        "LOW_AI_CONFIDENCE": {
            "level": "L1",
            "assigned_role": "Patient Care Coordinator",
            "sla_hours": 12,
            "priority_boost": 10,
            "description": "Inbound patient reply flagged for human interpretation",
        },
        "CANCELLATION_REQUEST": {
            "level": "L2",
            "assigned_role": "Clinical Counsellor",
            "sla_hours": 24,
            "priority_boost": 20,
            "description": "Patient requested treatment cycle discontinuation",
        },
    }

    @classmethod
    def escalate_followup(
        cls,
        db: Session,
        followup: Followup,
        trigger_key: str,
        custom_reason: Optional[str] = None,
        operator: str = "escalation_engine",
    ) -> Dict[str, Any]:
        """
        Escalates a follow-up to the human Exception Queue with SLA deadline and role assignment.
        """
        rule = cls.ESCALATION_RULES.get(trigger_key, cls.ESCALATION_RULES["NO_RESPONSE_ATTEMPTS"])
        now = datetime.utcnow()
        sla_deadline = now + timedelta(hours=rule["sla_hours"])
        reason_text = custom_reason or rule["description"]

        escalation_metadata = {
            "escalated_at": now.isoformat(),
            "trigger": trigger_key,
            "level": rule["level"],
            "assigned_to": rule["assigned_role"],
            "sla_deadline": sla_deadline.isoformat(),
            "sla_hours": rule["sla_hours"],
            "escalation_reason": reason_text,
        }

        # Transition follow-up state machine to ESCALATED
        FollowupStateMachine.transition(
            db=db,
            followup=followup,
            new_status=FollowupStatus.ESCALATED,
            changed_by=operator,
            reason=reason_text,
            additional_metadata=escalation_metadata,
        )

        AuditService.log_event(
            db=db,
            action=f"ESCALATION_{rule['level']}",
            table_name="escalations",
            record_id=followup.id,
            changed_by=operator,
            changes={
                "followup_id": followup.id,
                "patient_id": followup.patient_id,
                "level": rule["level"],
                "assigned_role": rule["assigned_role"],
                "sla_deadline": sla_deadline.isoformat(),
                "reason": reason_text,
            },
        )

        return {
            "success": True,
            "followup_id": followup.id,
            "status": "ESCALATED",
            "level": rule["level"],
            "assigned_role": rule["assigned_role"],
            "sla_deadline": sla_deadline.isoformat(),
            "reason": reason_text,
        }
