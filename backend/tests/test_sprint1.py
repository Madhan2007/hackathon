import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_sprint_1_flow():
    # 1. Test GET /patients
    res = client.get("/api/v1/patients/")
    assert res.status_code == 200
    patients = res.json()
    assert len(patients) >= 5
    print(f"[OK] GET /api/v1/patients/ returned {len(patients)} patients")

    # 2. Test GET /patients/{id}
    first_patient = patients[0]
    res = client.get(f"/api/v1/patients/{first_patient['id']}")
    assert res.status_code == 200
    assert res.json()["id"] == first_patient["id"]
    print(f"[OK] GET /api/v1/patients/{{id}} loaded patient: {first_patient['name']}")

    # 3. Test POST /patients
    test_phone = "+919842199001"
    # cleanup if exists
    res = client.post("/api/v1/patients/", json={
        "name": "Kavitha & Suresh",
        "phone": test_phone,
        "language": "ta",
        "district": "Thanjavur",
        "privacy_mode": True,
        "consent_status": True,
    })
    if res.status_code == 409:
        # Already exists from previous run, list and retrieve
        p_res = client.get(f"/api/v1/patients/?search=Kavitha")
        new_patient = p_res.json()[0]
    else:
        assert res.status_code == 201
        new_patient = res.json()
    print(f"[OK] POST /api/v1/patients/ created/found: {new_patient['name']}")

    # 4. Test POST /patients/{id}/cycles
    res = client.post(f"/api/v1/patients/{new_patient['id']}/cycles", json={
        "stage": "ivf_stimulation",
        "protocol": "Antagonist Protocol (rFSH 150 IU)",
        "status": "active"
    })
    assert res.status_code == 201
    cycle = res.json()
    assert cycle["patient_id"] == new_patient["id"]
    print(f"[OK] POST /api/v1/patients/{{id}}/cycles created cycle {cycle['id']} with stage {cycle['stage']}")

    # 5. Test POST /cycles/{id}/events
    res = client.post(f"/api/v1/cycles/{cycle['id']}/events", json={
        "event_type": "EGG_RETRIEVAL_COMPLETED",
        "new_stage": "egg_retrieval",
        "note": "14 oocytes successfully retrieved.",
        "metadata": {"oocytes_count": 14}
    })
    assert res.status_code == 200
    event_data = res.json()
    assert event_data["success"] is True
    assert event_data["current_stage"] == "egg_retrieval"
    print(f"[OK] POST /api/v1/cycles/{{id}}/events updated cycle stage to: {event_data['current_stage']}")

    # 6. Test GET /followups
    res = client.get("/api/v1/followups/")
    assert res.status_code == 200
    assert len(res.json()) > 0
    print(f"[OK] GET /api/v1/followups/ returned {len(res.json())} followups")

    print("==================================================")
    print("ALL SPRINT 1 BACKEND VERIFICATIONS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_sprint_1_flow()
