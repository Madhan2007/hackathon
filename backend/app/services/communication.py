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
                logger.warning(f"[Communication -> n8n] Webhook post failed ({e}).")

        # 2. Live Twilio WhatsApp Gateway Delivery
        twilio_sid = None
        twilio_status = None
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            try:
                dest_phone = patient.phone.strip()
                if not dest_phone.startswith("whatsapp:"):
                    dest_phone = f"whatsapp:{dest_phone}"
                twilio_url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
                tw_res = requests.post(
                    twilio_url,
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                    data={
                        "From": settings.TWILIO_WHATSAPP_FROM,
                        "To": dest_phone,
                        "Body": msg,
                    },
                    timeout=10.0,
                )
                if tw_res.ok:
                    tw_data = tw_res.json()
                    twilio_sid = tw_data.get("sid")
                    twilio_status = tw_data.get("status")
                    logger.info(f"[Communication -> Twilio] WhatsApp queued to {dest_phone} (SID={twilio_sid})")
                else:
                    logger.error(f"[Communication -> Twilio] Twilio HTTP {tw_res.status_code}: {tw_res.text}")
            except Exception as e:
                logger.error(f"[Communication -> Twilio] Dispatch error: {e}")

        # 3. Clinical Email Reminder Dispatch (Sent specifically to this patient's registered email)
        email_result = None
        recipient_email = getattr(patient, "email", None)
        if recipient_email and str(recipient_email).strip():
            try:
                from app.services.email_service import EmailService
                stage = followup.cycle.stage if (followup.cycle and followup.cycle.stage) else "clinical_care"
                due_str = followup.due_date.strftime("%d-%b-%Y %I:%M %p") if followup.due_date else "Today"
                tam_msg = followup.ai_metadata.get("tam_message", msg) if followup.ai_metadata else msg
                eng_msg = followup.ai_metadata.get("eng_message", msg) if followup.ai_metadata else msg
                email_result = EmailService.send_clinical_reminder(
                    to_email=recipient_email,
                    patient_name=patient.name,
                    stage=stage,
                    due_date=due_str,
                    tamil_message=tam_msg,
                    english_message=eng_msg,
                    priority_score=followup.priority_score,
                    followup_id=followup.id,
                )
                logger.info(f"[Communication -> Email] Clinical reminder sent to {recipient_email}: {email_result.get('status')}")
            except Exception as e:
                logger.error(f"[Communication -> Email] Error dispatching email to {recipient_email}: {e}")

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
                "twilio_sid": twilio_sid,
                "twilio_status": twilio_status,
                "email_dispatched": bool(email_result and email_result.get("success")),
                "email_status": email_result.get("status") if email_result else None,
            },
        )

        return {
            "success": True,
            "message_id": message_id,
            "patient_id": patient.id,
            "phone": patient.phone,
            "channel": channel,
            "content": msg,
            "status": "DELIVERED" if (twilio_sid or n8n_dispatched or (email_result and email_result.get("status") == "DELIVERED")) else "SIMULATED",
            "delivered_at": delivery_timestamp,
            "n8n_dispatched": n8n_dispatched,
            "n8n_status": n8n_response_status,
            "twilio_sid": twilio_sid,
            "twilio_status": twilio_status,
            "email_result": email_result,
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
