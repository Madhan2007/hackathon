import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from fastapi.testclient import TestClient
from app.main import app
from app.services.ai_engine import AIEngineService

client = TestClient(app)

def test_sprint_3():
    print("==================================================")
    print("[FertiFlow AI] Running Sprint 3 AI & WhatsApp Tests")
    print("==================================================")

    # 1. Test AI Intent Parser
    # Case A: Confirmation in Tamil
    intent_confirm = AIEngineService.parse_intent("1. வருகிறேன்")
    assert intent_confirm.intent == "CONFIRM", f"Expected CONFIRM, got {intent_confirm.intent}"
    print(f"[OK] Parsed Tamil Confirmation: {intent_confirm.intent} (Confidence: {intent_confirm.confidence_score})")

    # Case B: Reschedule in Tanglish/Tamil
    intent_resched = AIEngineService.parse_intent("நாளைக்கு வர முடியாது. Monday morning வரலாமா?")
    assert intent_resched.intent == "RESCHEDULE", f"Expected RESCHEDULE, got {intent_resched.intent}"
    print(f"[OK] Parsed Reschedule Request: {intent_resched.intent} (Preferred Day: {intent_resched.preferred_day}, Period: {intent_resched.preferred_period})")

    # Case C: Medical Question / Safety Guardrail
    intent_med = AIEngineService.parse_intent("வயிறு ரொம்ப வலிக்குது, tablet போடலாமா?")
    assert intent_med.intent in ["MEDICAL_QUESTION", "ESCALATE"], f"Expected MEDICAL_QUESTION, got {intent_med.intent}"
    print(f"[OK] Parsed Medical Symptom: {intent_med.intent} (Safety Guardrail Triggered)")

    # Case D: Financial / EMI Query
    intent_fin = AIEngineService.parse_intent("Treatment cost அதிகமா இருக்கு, EMI option இருக்கா?")
    assert intent_fin.intent == "FINANCIAL_ISSUE", f"Expected FINANCIAL_ISSUE, got {intent_fin.intent}"
    print(f"[OK] Parsed Financial Concern: {intent_fin.intent}")

    # 2. Test Inbound WhatsApp Webhook Endpoint
    patients = client.get("/api/v1/patients/").json()
    assert len(patients) > 0
    p = patients[0]

    # Test sending confirm reply through webhook
    res = client.post("/api/v1/webhooks/whatsapp", json={
        "phone": p["phone"],
        "message": "1. வருகிறேன்",
        "channel": "whatsapp",
        "patient_id": p["id"]
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["intent_analysis"]["intent"] == "CONFIRM"
    print(f"[OK] Webhook processed inbound message for {p['name']}. Action: {data['workflow_action']}")

    # Test medical symptom escalation through webhook
    res_med = client.post("/api/v1/webhooks/whatsapp", json={
        "phone": p["phone"],
        "message": "Severe pain and fever today",
        "channel": "whatsapp",
        "patient_id": p["id"]
    })
    assert res_med.status_code == 200
    med_data = res_med.json()
    assert med_data["intent_analysis"]["intent"] in ["MEDICAL_QUESTION", "ESCALATE"]
    print(f"[OK] Webhook medical escalation routed to duty nurse. New Status: {med_data['new_status']}")

    print("==================================================")
    print("ALL SPRINT 3 AI INTENT & WEBHOOK TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    test_sprint_3()
