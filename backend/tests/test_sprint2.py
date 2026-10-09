import sys
import os
from datetime import datetime, timedelta
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.database import SessionLocal, init_db
from app.models.patient import Patient
from app.models.cycle import Cycle, CycleStage, CycleStatus
from app.models.followup import Followup, FollowupType, FollowupStatus
from app.services.priority import PriorityScorer
from app.services.stage_rules import StageRulesEngine
from app.services.followup import FollowupStateMachine
from app.services.audit import AuditService
from app.scheduler.jobs import check_and_dispatch_due_followups, recompute_all_priorities

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def test_sprint_2():
    print("==================================================")
    print("[FertiFlow AI] Running Sprint 2 Core Engines & State Machine Tests")
    print("==================================================")
    init_db()
    db = SessionLocal()

    try:
        # 1. Test Priority Scorer
        score_hcg = PriorityScorer.calculate_score(
            followup_type=FollowupType.PREGNANCY_TEST,
            due_date=datetime.utcnow() + timedelta(hours=2),
            cycle_stage=CycleStage.EMBRYO_TRANSFER,
            status=FollowupStatus.SCHEDULED,
        )
        assert 90 <= score_hcg <= 100, f"Expected high score for Beta-hCG, got {score_hcg}"
        print(f"[OK] PriorityScorer calculated {score_hcg}/100 for immediate Beta-hCG follow-up")

        # 2. Test Stage Rules Engine
        patient = db.query(Patient).filter(Patient.name == "Madhan").first()
        if not patient:
            patient = db.query(Patient).first()
        cycle = patient.cycles[0]

        generated = StageRulesEngine.generate_followups_for_event(
            patient=patient,
            cycle=cycle,
            event_type="EMBRYO_TRANSFER_COMPLETED",
            note="Embryo Transfer completed successfully"
        )
        assert len(generated) >= 2, f"Expected 2 follow-ups (Beta-hCG + Progesterone), got {len(generated)}"
        assert any(f.type == FollowupType.PREGNANCY_TEST for f in generated)
        assert any(f.type == FollowupType.MEDICATION for f in generated)
        print(f"[OK] StageRulesEngine generated {len(generated)} tasks: {[f.type.value for f in generated]}")

        # 3. Test Follow-up Lifecycle State Machine
        sample_followup = db.query(Followup).first()
        initial_status = sample_followup.status

        # Transition to SENT
        if initial_status == FollowupStatus.PENDING:
            sample_followup = FollowupStateMachine.transition(db, sample_followup, FollowupStatus.SCHEDULED)
        
        sample_followup = FollowupStateMachine.transition(db, sample_followup, FollowupStatus.SENT)
        assert sample_followup.status == FollowupStatus.SENT
        print(f"[OK] FollowupStateMachine transitioned task to: {sample_followup.status.value}")

        # Transition to COMPLETED
        sample_followup = FollowupStateMachine.transition(db, sample_followup, FollowupStatus.COMPLETED)
        assert sample_followup.status == FollowupStatus.COMPLETED
        print(f"[OK] FollowupStateMachine transitioned task to: {sample_followup.status.value}")

        # 4. Test Background Jobs
        check_and_dispatch_due_followups()
        recompute_all_priorities()
        print("[OK] Background cron jobs executed cleanly without errors")

        print("==================================================")
        print("ALL SPRINT 2 ENGINE & WORKFLOW TESTS PASSED!")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    test_sprint_2()
