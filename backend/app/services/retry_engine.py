from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.models.followup import Followup, FollowupStatus
from app.services.followup import FollowupStateMachine
from app.services.escalation import EscalationEngine
from app.services.communication import CommunicationService


class RetryEngine:
    MAX_ATTEMPTS = 3

    @classmethod
    def process_retry(
        cls,
        db: Session,
        followup: Followup,
    ) -> Dict[str, Any]:
        """
        Executes multi-tier retry logic:
        Attempt 1 -> WhatsApp
        Attempt 2 -> SMS fallback
        Attempt 3 -> Escalation to staff
        """
        meta = dict(followup.ai_metadata or {})
        attempts = meta.get("attempt_count", 1) + 1
        meta["attempt_count"] = attempts

        if attempts >= cls.MAX_ATTEMPTS:
            # Escalation triggered
            return EscalationEngine.escalate_followup(
                db=db,
                followup=followup,
                trigger_key="NO_RESPONSE_ATTEMPTS",
                custom_reason=f"Exceeded maximum automated attempts ({cls.MAX_ATTEMPTS}). Requires manual coordinator phone call.",
                operator="retry_engine",
            )
        else:
            channel = "sms" if attempts == 2 else "whatsapp"
            FollowupStateMachine.transition(
                db=db,
                followup=followup,
                new_status=FollowupStatus.RETRY,
                changed_by="retry_engine",
                reason=f"Non-response retry attempt {attempts} using {channel.upper()}",
                additional_metadata={"attempt_count": attempts, "recommended_channel": channel},
            )

            # Dispatch channel retry
            CommunicationService.dispatch_outreach(
                db=db,
                patient=followup.patient,
                followup=followup,
                channel=channel,
            )

            return {
                "success": True,
                "followup_id": followup.id,
                "status": "RETRY",
                "attempt_count": attempts,
                "channel": channel,
            }
