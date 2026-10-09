from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import HTTPException, status

from app.models.followup import Followup, FollowupStatus, FollowupType
from app.models.cycle import Cycle
from app.models.patient import Patient
from app.services.audit import AuditService
from app.services.priority import PriorityScorer


class FollowupStateMachine:
    """
    Follow-up lifecycle state machine with validation, priority re-scoring, and audit trails.
    """

    VALID_TRANSITIONS = {
        FollowupStatus.PENDING: [
            FollowupStatus.SCHEDULED,
            FollowupStatus.SENT,
            FollowupStatus.COMPLETED,
            FollowupStatus.RESCHEDULE_REQUESTED,
            FollowupStatus.ESCALATED,
            FollowupStatus.CANCELLED,
        ],
        FollowupStatus.SCHEDULED: [
            FollowupStatus.SENT,
            FollowupStatus.COMPLETED,
            FollowupStatus.RESCHEDULE_REQUESTED,
            FollowupStatus.RESCHEDULED,
            FollowupStatus.ESCALATED,
            FollowupStatus.CANCELLED,
        ],
        FollowupStatus.SENT: [
            FollowupStatus.SENT,
            FollowupStatus.COMPLETED,
            FollowupStatus.RESCHEDULE_REQUESTED,
            FollowupStatus.ESCALATED,
            FollowupStatus.RETRY,
            FollowupStatus.CANCELLED,
        ],
        FollowupStatus.RETRY: [
            FollowupStatus.SENT,
            FollowupStatus.COMPLETED,
            FollowupStatus.ESCALATED,
            FollowupStatus.CANCELLED,
        ],
        FollowupStatus.RESCHEDULE_REQUESTED: [
            FollowupStatus.SENT,
            FollowupStatus.SLOT_OFFERED,
            FollowupStatus.RESCHEDULED,
            FollowupStatus.ESCALATED,
            FollowupStatus.CANCELLED,
            FollowupStatus.COMPLETED,
        ],
        FollowupStatus.SLOT_OFFERED: [
            FollowupStatus.SENT,
            FollowupStatus.RESCHEDULED,
            FollowupStatus.ESCALATED,
            FollowupStatus.CANCELLED,
            FollowupStatus.COMPLETED,
        ],
        FollowupStatus.RESCHEDULED: [
            FollowupStatus.SENT,
            FollowupStatus.PENDING,
            FollowupStatus.SCHEDULED,
            FollowupStatus.COMPLETED,
        ],
        FollowupStatus.ESCALATED: [
            FollowupStatus.SENT,
            FollowupStatus.COMPLETED,
            FollowupStatus.MISSED,
            FollowupStatus.CANCELLED,
            FollowupStatus.SCHEDULED,
        ],
        FollowupStatus.COMPLETED: [
            FollowupStatus.SENT,
            FollowupStatus.RESCHEDULE_REQUESTED,
            FollowupStatus.SCHEDULED,
            FollowupStatus.PENDING,
            FollowupStatus.ESCALATED,
        ],
        FollowupStatus.MISSED: [
            FollowupStatus.SENT,
            FollowupStatus.RESCHEDULE_REQUESTED,
            FollowupStatus.SCHEDULED,
            FollowupStatus.PENDING,
            FollowupStatus.ESCALATED,
            FollowupStatus.COMPLETED,
        ],
        FollowupStatus.CANCELLED: [
            FollowupStatus.SENT,
            FollowupStatus.PENDING,
            FollowupStatus.SCHEDULED,
        ],
    }

    @classmethod
    def transition(
        cls,
        db: Session,
        followup: Followup,
        new_status: FollowupStatus,
        changed_by: str = "coordinator",
        reason: Optional[str] = None,
        additional_metadata: Optional[Dict[str, Any]] = None,
    ) -> Followup:
        """
        Executes a validated lifecycle transition, logs audit events, and updates priority scores.
        """
        current_status = followup.status

        # If already same status and sending, still allow dispatch
        if current_status == new_status:
            if new_status == FollowupStatus.SENT and followup.patient:
                try:
                    from app.services.communication import CommunicationService
                    CommunicationService.dispatch_outreach(
                        db=db,
                        patient=followup.patient,
                        followup=followup,
                    )
                except Exception as e:
                    import logging
                    logging.getLogger("fertiflow.followup").warning(f"Failed to dispatch outreach: {e}")
            return followup

        valid_targets = cls.VALID_TRANSITIONS.get(current_status, [])
        if new_status not in valid_targets:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid follow-up state transition from '{current_status.value}' to '{new_status.value}'."
            )

        previous_val = {
            "status": current_status.value if hasattr(current_status, 'value') else current_status,
            "priority_score": followup.priority_score,
            "missed_reason": followup.missed_reason,
        }

        # Update status and reason
        followup.status = new_status
        if reason:
            followup.missed_reason = reason

        # Merge metadata
        if additional_metadata:
            meta = dict(followup.ai_metadata or {})
            meta.update(additional_metadata)
            followup.ai_metadata = meta

        # Re-calculate dynamic priority
        cycle_stage = followup.cycle.stage if followup.cycle else None
        followup.priority_score = PriorityScorer.calculate_score(
            followup_type=followup.type,
            due_date=followup.due_date,
            cycle_stage=cycle_stage,
            status=new_status,
            has_missed_reason=bool(followup.missed_reason),
        )

        # Log audit entry
        AuditService.log_event(
            db=db,
            action=f"TRANSITION_{new_status.value.upper()}",
            table_name="followups",
            record_id=followup.id,
            changed_by=changed_by,
            changes={
                "status": new_status.value if hasattr(new_status, 'value') else new_status,
                "priority_score": followup.priority_score,
                "reason": reason,
            },
            previous_value=previous_val,
        )

        db.commit()
        db.refresh(followup)

        # Dispatch outbound communication when marked SENT
        if new_status == FollowupStatus.SENT and followup.patient:
            try:
                from app.services.communication import CommunicationService
                CommunicationService.dispatch_outreach(
                    db=db,
                    patient=followup.patient,
                    followup=followup,
                )
            except Exception as e:
                import logging
                logging.getLogger("fertiflow.followup").warning(f"Failed to dispatch outreach on transition: {e}")

        return followup
