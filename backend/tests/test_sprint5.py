import sys
import os
from datetime import datetime
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal, init_db
from app.models.patient import Patient
from app.models.followup import Followup, FollowupStatus
from app.services.escalation import EscalationEngine
from app.services.retry_engine import RetryEngine

client = TestClient(app)

def test_sprint_5():
    print("==================================================")
    print("[FertiFlow AI] Running Sprint 5 Escalation & Analytics Tests")
    print("==================================================")
    init_db()
    db = SessionLocal()

    try:
        # 1. Test Escalation Engine with Medical Trigger
        followup = db.query(Followup).first()
        esc_res = EscalationEngine.escalate_followup(
            db=db,
            followup=followup,
            trigger_key="MEDICAL_QUESTION",
            custom_reason="Patient reports severe cramping and pain",
            operator="nurse_triage",
        )
        assert esc_res["success"] is True
        assert esc_res["level"] == "L3"
        assert esc_res["assigned_role"] == "Duty Nurse & Doctor"
        print(f"[OK] EscalationEngine assigned {esc_res['level']} escalation to: {esc_res['assigned_role']} (SLA: {esc_res['sla_deadline']})")

        # 2. Test Multi-tier Retry Engine
        retry_followup = db.query(Followup).first()
        retry_followup.status = FollowupStatus.SENT
        db.commit()

        retry_res = RetryEngine.process_retry(db=db, followup=retry_followup)
        assert retry_res["success"] is True
        print(f"[OK] RetryEngine handled retry tier. Channel: {retry_res.get('channel', 'escalated')}, Status: {retry_res['status']}")

        # 3. Test Analytics & Missed Reason API Endpoints
        res_reason = client.post("/api/v1/analytics/record-missed-reason", params={
            "followup_id": followup.id,
            "reason_code": "TRAVEL",
            "notes": "Patient delayed on bus from Tirunelveli to Madurai center",
        })
        assert res_reason.status_code == 200
        assert res_reason.json()["success"] is True
        print(f"[OK] POST /analytics/record-missed-reason tagged: {res_reason.json()['missed_reason']}")

        # 4. Test Analytics Overview
        overview_res = client.get("/api/v1/analytics/overview")
        assert overview_res.status_code == 200
        ov_data = overview_res.json()
        assert "adherence_rate" in ov_data["kpi"]
        print(f"[OK] GET /analytics/overview loaded adherence: {ov_data['kpi']['adherence_rate']}, patients: {ov_data['kpi']['total_patients']}")

        # 5. Test Reasons Distribution Breakdown
        reasons_res = client.get("/api/v1/analytics/reasons")
        assert reasons_res.status_code == 200
        assert len(reasons_res.json()["distribution"]) > 0
        print(f"[OK] GET /analytics/reasons returned {len(reasons_res.json()['distribution'])} reason categories")

        print("==================================================")
        print("ALL SPRINT 5 ESCALATION & ANALYTICS TESTS PASSED!")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    test_sprint_5()
