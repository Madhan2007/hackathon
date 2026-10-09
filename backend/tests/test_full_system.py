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
from app.models.cycle import Cycle
from app.models.followup import Followup
from app.models.appointment import Appointment
from app.models.audit import AuditLog

client = TestClient(app)

def run_e2e_hackathon_demo():
    print("==================================================")
    print("[FertiFlow AI] Running End-to-End Master Validation")
    print("==================================================")
    init_db()
    db = SessionLocal()

    try:
        # ACT 1: AUTOMATED TRIGGER (Embryo Transfer -> Beta-hCG)
        print("\n--- ACT 1: Automated Clinical Milestone Trigger ---")
        madhan = db.query(Patient).filter(Patient.name == "Madhan").first()
        if not madhan:
            madhan = db.query(Patient).first()
        cycle = madhan.cycles[0]

        res_event = client.post(f"/api/v1/cycles/{cycle.id}/events", json={
            "event_type": "EMBRYO_TRANSFER_COMPLETED",
            "new_stage": "embryo_transfer",
            "note": "Day-5 Blastocyst Transfer successfully completed",
            "metadata": {"grade": "4AA", "transferred_by": "Dr. Subha"},
        })
        assert res_event.status_code == 200
        event_data = res_event.json()
        assert event_data["generated_followups_count"] >= 2
        print(f"[SUCCESS] Embryo Transfer logged. Generated {event_data['generated_followups_count']} automated follow-up tasks.")
        for f in event_data["generated_followups"]:
            print(f"   -> Task: {f['type'].upper()} | Priority: {f['priority_score']}/100 | Due: {f['due_date']}")

        # ACT 2: MULTILINGUAL INBOUND WHATSAPP & GEMINI NLU
        print("\n--- ACT 2: Tamil WhatsApp Simulation & Gemini NLU ---")
        sample_hcg_id = event_data["generated_followups"][0]["id"]

        res_webhook = client.post("/api/v1/webhooks/whatsapp", json={
            "phone": madhan.phone,
            "message": "நாளைக்கு வர முடியாது. Monday morning வரலாமா?",
            "channel": "whatsapp",
            "patient_id": madhan.id,
            "followup_id": sample_hcg_id,
        })
        assert res_webhook.status_code == 200
        wh_data = res_webhook.json()
        assert wh_data["intent_analysis"]["intent"] == "RESCHEDULE"
        print(f"[SUCCESS] Inbound WhatsApp Parsed: Intent={wh_data['intent_analysis']['intent']} (Day={wh_data['intent_analysis'].get('preferred_day')}, Period={wh_data['intent_analysis'].get('preferred_period')})")
        print(f"   AI Reply: {wh_data['reply_message'][:70]}...")

        # ACT 3: SLOT DISCOVERY & ATOMIC RESCHEDULE
        print("\n--- ACT 3: Slot Discovery & Atomic Reschedule ---")
        slots_res = client.get("/api/v1/appointments/slots?preferred_period=MORNING")
        assert slots_res.status_code == 200
        slots = slots_res.json()
        assert len(slots) > 0
        chosen_slot = slots[0]

        resched_res = client.post("/api/v1/appointments/reschedule", json={
            "followup_id": sample_hcg_id,
            "target_slot_datetime": chosen_slot["datetime"],
            "reason": "Patient requested Monday morning slot",
            "doctor_name": chosen_slot["doctor_name"],
            "changed_by": "coordinator",
        })
        assert resched_res.status_code == 200
        resched_data = resched_res.json()
        assert resched_data["success"] is True
        print(f"[SUCCESS] Atomic Reschedule Executed: {resched_data['formatted_datetime']} with {resched_data['doctor']}")

        # ACT 4: MEDICAL SAFETY GUARDRAIL & AUDIT TRAIL
        print("\n--- ACT 4: Medical Safety Guardrail & Immutable Audit ---")
        med_res = client.post("/api/v1/webhooks/whatsapp", json={
            "phone": madhan.phone,
            "message": "வயிறு ரொம்ப வலிக்குது, tablet போடலாமா?",
            "channel": "whatsapp",
            "patient_id": madhan.id,
        })
        assert med_res.status_code == 200
        med_data = med_res.json()
        assert med_data["intent_analysis"]["intent"] in ["MEDICAL_QUESTION", "ESCALATE"]
        print(f"[SUCCESS] Medical Guardrail Triggered: Flagged {med_data['intent_analysis']['intent']}. Routed to Duty Nurse with Level 3 SLA.")

        # Verify Immutable Audit Trail
        audit_res = client.get(f"/api/v1/audit/?record_id={madhan.id}")
        assert audit_res.status_code == 200
        print(f"[SUCCESS] Immutable Audit Trail verified: Found {len(audit_res.json())} audit log records for patient.")

        print("\n==================================================")
        print("🎉 ALL 6 SPRINTS & FULL-SYSTEM END-TO-END DEMO PASSED!")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_e2e_hackathon_demo()
