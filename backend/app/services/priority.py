from datetime import datetime, timezone
from typing import Optional
from app.models.followup import FollowupType, FollowupStatus
from app.models.cycle import CycleStage


class PriorityScorer:
    """
    Dynamic priority scoring engine (1 to 100).
    Higher scores indicate higher clinical urgency and immediate action requirements.
    """

    # Base scores by Clinical Follow-up Type
    TYPE_BASE_SCORES = {
        FollowupType.PREGNANCY_TEST: 90,  # Critical milestone (Beta-hCG)
        FollowupType.PROCEDURE_PREP: 85,  # Trigger shot, fasting, OPU prep
        FollowupType.MEDICATION: 80,      # Progesterone, Gonadotropins timing
        FollowupType.INVESTIGATION: 70,   # Follicular scan, AMH, Semen analysis
        FollowupType.APPOINTMENT: 60,     # Doctor review, routine check
        FollowupType.COUNSELLING: 75,     # Emotional support, post-failed cycle
        FollowupType.FINANCIAL: 50,       # EMI/package discussion
        FollowupType.SUPPORT: 50,         # General queries
    }

    # Additional weight by current treatment cycle stage
    STAGE_WEIGHTS = {
        CycleStage.EMBRYO_TRANSFER: 15,
        CycleStage.BETA_HCG: 15,
        CycleStage.EGG_RETRIEVAL: 12,
        CycleStage.IVF_STIMULATION: 10,
        CycleStage.IUI_PREP: 8,
        CycleStage.DIAGNOSIS: 5,
        CycleStage.CONSULTATION: 2,
        CycleStage.ENQUIRY: 0,
        CycleStage.OUTCOME: 5,
    }

    @classmethod
    def calculate_score(
        cls,
        followup_type: FollowupType,
        due_date: datetime,
        cycle_stage: Optional[CycleStage] = None,
        status: Optional[FollowupStatus] = None,
        attempt_count: int = 0,
        has_missed_reason: bool = False,
    ) -> int:
        """
        Calculate dynamic priority score from 1 to 100.
        """
        score = cls.TYPE_BASE_SCORES.get(followup_type, 50)

        # 1. Stage Weight
        if cycle_stage:
            score += cls.STAGE_WEIGHTS.get(cycle_stage, 0)

        # 2. Due Date Urgency
        now = datetime.utcnow()
        if due_date.tzinfo is not None:
            # If due_date is timezone aware, use utc
            now = datetime.now(timezone.utc)

        time_delta = due_date - now
        hours_to_due = time_delta.total_seconds() / 3600.0

        if hours_to_due < 0:
            # Overdue task
            score += 15
        elif hours_to_due <= 12:
            # Due in less than 12 hours
            score += 10
        elif hours_to_due <= 24:
            # Due within 24 hours
            score += 5

        # 3. Escalation / Retry Status
        if status in [FollowupStatus.RETRY, FollowupStatus.ESCALATED]:
            score += 15
        elif status == FollowupStatus.RESCHEDULE_REQUESTED:
            score += 10

        # 4. Attempt count penalty
        if attempt_count >= 2:
            score += 10

        # 5. Missed reason flag
        if has_missed_reason:
            score += 10

        # Clamp score to 1 - 100 range
        return max(1, min(100, score))
