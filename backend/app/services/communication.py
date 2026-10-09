from typing import Dict, Any, Optional
from datetime import datetime
import logging
import uuid
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.followup import Followup
from app.services.audit import AuditService

import requests
from app.config import get_settings

logger = logging.getLogger("fertiflow.communication")


class CommunicationService:
    @classmethod
    def dispatch_outreach(
        cls,
        db: Session,
        patient: Patient,
        followup: Followup,
        channel: str = "whatsapp",
        custom_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Dispatches outbound notification to the patient across specified channel.
        Simulates WhatsApp / SMS gateway response, records audit log, and optionally
        triggers n8n workflow for live WhatsApp / multi-channel delivery.
        """
        settings = get_settings()
        msg = custom_message or followup.ai_metadata.get(
            "tam_message" if patient.language == "ta" else "eng_message",
            "Reminder from FertiFlow Clinic"
        )

        message_id = f"msg_{uuid.uuid4().hex[:12]}"
        delivery_timestamp = datetime.utcnow().isoformat()

        logger.info(f"[Communication] Sending {channel.upper()} to {patient.phone} ({patient.name}): {msg[:50]}...")

        n8n_dispatched = False
        n8n_response_status = None

        # If n8n integration is enabled, forward to n8n outbound webhook
        if settings.N8N_ENABLED and settings.N8N_OUTBOUND_WEBHOOK_URL:
            payload = {
                "event": "PATIENT_OUTREACH",
                "message_id": message_id,
                "patient_id": patient.id,
                "patient_name": patient.name,
                "phone": patient.phone,
                "language": patient.language,
                "channel": channel,
                "message": msg,
                "followup_id": followup.id,
                "due_date": followup.due_date.isoformat() if followup.due_date else None,
                "timestamp": delivery_timestamp,
            }
            try:
                res = requests.post(
                    settings.N8N_OUTBOUND_WEBHOOK_URL,
                    json=payload,
                    timeout=settings.N8N_WEBHOOK_TIMEOUT,
                )
                n8n_dispatched = res.ok
                n8n_response_status = res.status_code
                logger.info(f"[Communication -> n8n] Dispatched to n8n webhook (status={res.status_code})")
            except Exception as e:
                logger.warning(f"[Communication -> n8n] Webhook post failed ({e}). Falling back to simulation.")

        # Record Audit Event
        AuditService.log_event(
            db=db,
            action="MESSAGE_DISPATCHED",
            table_name="communications",
            record_id=message_id,
            changed_by="communication_orchestrator",
            changes={
                "patient_id": patient.id,
                "followup_id": followup.id,
                "phone": patient.phone,
                "channel": channel,
                "message": msg,
                "timestamp": delivery_timestamp,
                "n8n_dispatched": n8n_dispatched,
            },
        )

        return {
            "success": True,
            "message_id": message_id,
            "patient_id": patient.id,
            "phone": patient.phone,
            "channel": channel,
            "content": msg,
            "status": "DELIVERED",
            "delivered_at": delivery_timestamp,
            "n8n_dispatched": n8n_dispatched,
            "n8n_status": n8n_response_status,
        }

    @classmethod
    def dispatch_doctor_escalation(
        cls,
        db: Session,
        patient: Patient,
        followup: Optional[Followup],
        reason: str,
        urgency: str = "IMMEDIATE",
    ) -> Dict[str, Any]:
        """
        Dispatches urgent doctor escalation notification to staff channels
        (Slack / Teams / Emergency WhatsApp via n8n).
        """
        settings = get_settings()
        alert_id = f"alt_{uuid.uuid4().hex[:12]}"
        timestamp = datetime.utcnow().isoformat()

        logger.warning(
            f"[Escalation Alert] Patient {patient.name} ({patient.phone}) flagged for {urgency} escalation: {reason}"
        )

        n8n_alert_dispatched = False
        if settings.N8N_ENABLED and settings.N8N_DOCTOR_ALERT_WEBHOOK_URL:
            alert_payload = {
                "event": "URGENT_DOCTOR_ESCALATION",
                "alert_id": alert_id,
                "patient_id": patient.id,
                "patient_name": patient.name,
                "patient_phone": patient.phone,
                "patient_district": patient.district,
                "language": patient.language,
                "followup_id": followup.id if followup else None,
                "urgency": urgency,
                "symptom_or_reason": reason,
                "timestamp": timestamp,
            }
            try:
                res = requests.post(
                    settings.N8N_DOCTOR_ALERT_WEBHOOK_URL,
                    json=alert_payload,
                    timeout=settings.N8N_WEBHOOK_TIMEOUT,
                )
                n8n_alert_dispatched = res.ok
                logger.info(f"[Doctor Alert -> n8n] Alert sent to n8n (status={res.status_code})")
            except Exception as e:
                logger.warning(f"[Doctor Alert -> n8n] n8n alert webhook failed: {e}")

        # Audit escalation dispatch
        AuditService.log_event(
            db=db,
            action="DOCTOR_ESCALATION_NOTIFIED",
            table_name="escalations",
            record_id=alert_id,
            changed_by="ai_safety_guardrail",
            changes={
                "patient_id": patient.id,
                "urgency": urgency,
                "reason": reason,
                "n8n_dispatched": n8n_alert_dispatched,
                "timestamp": timestamp,
            },
        )

        return {
            "alert_id": alert_id,
            "dispatched": n8n_alert_dispatched,
            "patient_name": patient.name,
            "urgency": urgency,
        }
