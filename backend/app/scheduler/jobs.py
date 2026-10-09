from datetime import datetime, timedelta
import logging
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.followup import Followup, FollowupStatus
from app.services.followup import FollowupStateMachine
from app.services.priority import PriorityScorer

logger = logging.getLogger("fertiflow.jobs")


def check_and_dispatch_due_followups():
    """
    Background Cron Task:
    1. Finds scheduled follow-up tasks whose due_date <= now() + 30 mins window.
    2. Dispatches outreach messages (WhatsApp/SMS simulated).
    3. Updates status to SENT and recalculates priority.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        due_tasks = (
            db.query(Followup)
            .filter(
                Followup.status == FollowupStatus.SCHEDULED,
                Followup.due_date <= now + timedelta(minutes=30),
            )
            .all()
        )

        if due_tasks:
            logger.info(f"[Jobs] Found {len(due_tasks)} follow-ups due for outreach dispatch.")

        for task in due_tasks:
            try:
                FollowupStateMachine.transition(
                    db=db,
                    followup=task,
                    new_status=FollowupStatus.SENT,
                    changed_by="scheduler_dispatch_engine",
                    additional_metadata={
                        "dispatched_at": now.isoformat(),
                        "channel": task.ai_metadata.get("recommended_channel", "whatsapp"),
                    },
                )
                logger.info(f"[Jobs] Auto-dispatched follow-up ID={task.id} (Patient ID={task.patient_id})")
            except Exception as e:
                logger.error(f"[Jobs] Error dispatching follow-up {task.id}: {e}")

    except Exception as e:
        logger.error(f"[Jobs] Error in check_and_dispatch_due_followups: {e}")
    finally:
        db.close()


def check_overdue_and_escalate():
    """
    Background Cron Task:
    Identifies non-responded follow-ups past retry SLA and escalates them to the Exception Queue.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        # Follow-ups sent more than 24 hours ago with no response
        stale_sent = (
            db.query(Followup)
            .filter(
                Followup.status == FollowupStatus.SENT,
                Followup.due_date < now - timedelta(hours=24),
            )
            .all()
        )

        for task in stale_sent:
            try:
                FollowupStateMachine.transition(
                    db=db,
                    followup=task,
                    new_status=FollowupStatus.RETRY,
                    changed_by="scheduler_retry_engine",
                    reason="24-hour response window elapsed without patient confirmation.",
                )
                logger.info(f"[Jobs] Follow-up ID={task.id} marked for RETRY.")
            except Exception as e:
                logger.error(f"[Jobs] Error updating retry for task {task.id}: {e}")

    except Exception as e:
        logger.error(f"[Jobs] Error in check_overdue_and_escalate: {e}")
    finally:
        db.close()


def recompute_all_priorities():
    """
    Periodic job to adjust dynamic priority scores across all active follow-ups as due_date approaches.
    """
    db: Session = SessionLocal()
    try:
        active_tasks = (
            db.query(Followup)
            .filter(
                Followup.status.in_([
                    FollowupStatus.PENDING,
                    FollowupStatus.SCHEDULED,
                    FollowupStatus.SENT,
                    FollowupStatus.RETRY,
                    FollowupStatus.RESCHEDULE_REQUESTED,
                ])
            )
            .all()
        )

        for task in active_tasks:
            cycle_stage = task.cycle.stage if task.cycle else None
            new_score = PriorityScorer.calculate_score(
                followup_type=task.type,
                due_date=task.due_date,
                cycle_stage=cycle_stage,
                status=task.status,
                has_missed_reason=bool(task.missed_reason),
            )
            task.priority_score = new_score

        db.commit()
    except Exception as e:
        logger.error(f"[Jobs] Error recomputing priorities: {e}")
    finally:
        db.close()


def register_scheduled_jobs(scheduler):
    """Register all background cron intervals with the scheduler."""
    scheduler.add_job(
        check_and_dispatch_due_followups,
        trigger="interval",
        seconds=60,
        id="check_due_followups",
        replace_existing=True,
    )
    scheduler.add_job(
        check_overdue_and_escalate,
        trigger="interval",
        seconds=120,
        id="check_overdue_escalate",
        replace_existing=True,
    )
    scheduler.add_job(
        recompute_all_priorities,
        trigger="interval",
        minutes=5,
        id="recompute_priorities",
        replace_existing=True,
    )
