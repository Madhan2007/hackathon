import sys
import os
from datetime import datetime, timedelta
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
from app.models.followup import Followup
from app.services.scheduling import SchedulingService
from app.services.reschedule import RescheduleTransactionEngine

client = TestClient(app)

def test_sprint_4():
    print("==================================================")
    print("[FertiFlow AI] Running Sprint 4 Scheduling & Reschedule Tests")
    print("==================================================")
    init_db()
    db = SessionLocal()

    try:
        # 1. Test Slot Discovery
        slots = SchedulingService.discover_available_slots(db=db, preferred_period="MORNING", days_ahead=7)
        assert len(slots) > 0, "Expected at least 1 morning slot discovered"
        assert all(s.period == "MORNING" for s in slots)
        print(f"[OK] Discovered {len(slots)} morning slots. Top slot: {slots[0].formatted_date} at {slots[0].formatted_time}")

        # 2. Test Atomic Reschedule Transaction
        followup = db.query(Followup).first()
        target_slot_dt = datetime.utcnow() + timedelta(days=3, hours=10)

        reschedule_result = RescheduleTransactionEngine.execute_atomic_reschedule(
            db=db,
            followup_id=followup.id,
            target_slot_datetime=target_slot_dt,
            reason="Patient requested travel delay reschedule",
            doctor_name="Dr. Subha Fertility Specialist",
            changed_by="coordinator_test",
        )
        assert reschedule_result["success"] is True
        assert reschedule_result["appointment_id"] is not None
        print(f"[OK] Executed Atomic Reschedule for {reschedule_result['patient_name']}: {reschedule_result['formatted_datetime']}")

        # 3. Test HTTP API Endpoints
        res_slots = client.get("/api/v1/appointments/slots?preferred_period=AFTERNOON")
        assert res_slots.status_code == 200
        assert len(res_slots.json()) > 0
        print(f"[OK] GET /api/v1/appointments/slots returned {len(res_slots.json())} slots")

        res_post = client.post("/api/v1/appointments/reschedule", json={
            "followup_id": followup.id,
            "target_slot_datetime": (datetime.utcnow() + timedelta(days=4, hours=14)).isoformat(),
            "reason": "Doctor schedule adjustment",
            "doctor_name": "Dr. Subha Fertility Specialist",
            "changed_by": "coordinator",
        })
        assert res_post.status_code == 200
        assert res_post.json()["success"] is True
        print(f"[OK] POST /api/v1/appointments/reschedule confirmed atomic booking")

        print("==================================================")
        print("ALL SPRINT 4 SCHEDULING & RESCHEDULING TESTS PASSED!")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    test_sprint_4()
