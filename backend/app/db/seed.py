"""
FertiFlow AI - Dummy Data Seeder
Seeds 5 realistic Tamil Nadu demo patients with cycles, follow-ups, and audit records.
"""

import sys
import os
import uuid
from datetime import datetime, timedelta

# Ensure backend directory is in sys.path when running standalone
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.db.database import SessionLocal, init_db, engine, Base
from app.models.patient import Patient
from app.models.cycle import Cycle, CycleStage, CycleStatus
from app.models.followup import Followup, FollowupType, FollowupStatus
from app.models.audit import AuditLog


if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def seed_database():
    print("==================================================")
    print("[FertiFlow AI] Database Seeder")
    print("==================================================")
    print("1. Creating database tables if not exist...")
    init_db()

    db = SessionLocal()
    try:
        # Check existing patients to avoid duplicate phone conflicts
        demo_phones = [
            "+919842100001",
            "+919842100002",
            "+919842100003",
            "+919842100004",
            "+919842100005",
        ]
        existing = db.query(Patient).filter(Patient.phone.in_(demo_phones)).all()
        if existing:
            print(f"⚠️ Found {len(existing)} existing demo records. Cleaning up old demo data...")
            for p in existing:
                db.delete(p)
            db.commit()

        now = datetime.utcnow()

        demo_data = [
            {
                "patient": {
                    "id": str(uuid.uuid4()),
                    "name": "Madhan",
                    "phone": "+919842100001",
                    "language": "ta",
                    "district": "Tirunelveli",
                    "privacy_mode": True,
                    "consent_status": True,
                    "created_at": now - timedelta(days=25),
                },
                "cycle": {
                    "stage": CycleStage.EMBRYO_TRANSFER,
                    "protocol": "Freeze-All Blastocyst Transfer (HRT Protocol)",
                    "status": CycleStatus.ACTIVE,
                    "start_date": now - timedelta(days=20),
                },
                "followups": [
                    {
                        "type": FollowupType.MEDICATION,
                        "due_date": now + timedelta(hours=6),
                        "status": FollowupStatus.SCHEDULED,
                        "priority_score": 95,
                        "missed_reason": None,
                        "ai_metadata": {
                            "category": "luteal_support",
                            "medication_name": "Progesterone Gel 8% & Estradiol 2mg",
                            "tam_message": "வணக்கம் மாதன் அவர்களே, உங்கள் கரு மாற்றத்திற்கு பிந்தைய புரோஜெஸ்ட்டிரோன் மருந்துகளை சரியான நேரத்தில் உட்கொள்ளவும்.",
                            "recommended_channel": "whatsapp",
                            "sentiment": "anxious_positive",
                        }
                    },
                    {
                        "type": FollowupType.PREGNANCY_TEST,
                        "due_date": now + timedelta(days=12),
                        "status": FollowupStatus.PENDING,
                        "priority_score": 85,
                        "missed_reason": None,
                        "ai_metadata": {
                            "category": "beta_hcg_confirmation",
                            "tam_message": "சீரம் பீட்டா hCG பரிசோதனைக்கான நினைவூட்டல்.",
                        }
                    }
                ]
            },
            {
                "patient": {
                    "id": str(uuid.uuid4()),
                    "name": "Lakshmi",
                    "phone": "+919842100002",
                    "language": "ta",
                    "district": "Madurai",
                    "privacy_mode": False,
                    "consent_status": True,
                    "created_at": now - timedelta(days=8),
                },
                "cycle": {
                    "stage": CycleStage.IVF_STIMULATION,
                    "protocol": "Antagonist Protocol (rFSH 225 IU + Cetrorelix)",
                    "status": CycleStatus.ACTIVE,
                    "start_date": now - timedelta(days=6),
                },
                "followups": [
                    {
                        "type": FollowupType.INVESTIGATION,
                        "due_date": now + timedelta(hours=14),
                        "status": FollowupStatus.SCHEDULED,
                        "priority_score": 90,
                        "missed_reason": None,
                        "ai_metadata": {
                            "category": "follicular_monitoring",
                            "scan_type": "Day 8 Transvaginal Ultrasound & Serum Estradiol",
                            "tam_message": "வணக்கம் லட்சுமி, நாளை காலை 8:30 மணிக்கு உங்கள் 8-ம் நாள் ஃபோலிகுலர் கண்காணிப்பு ஸ்கேன் உள்ளது.",
                        }
                    }
                ]
            },
            {
                "patient": {
                    "id": str(uuid.uuid4()),
                    "name": "Priya & Kumar",
                    "phone": "+919842100003",
                    "language": "en",
                    "district": "Chennai",
                    "privacy_mode": False,
                    "consent_status": True,
                    "created_at": now - timedelta(days=2),
                },
                "cycle": {
                    "stage": CycleStage.CONSULTATION,
                    "protocol": "Primary Fertility Evaluation & Semen Analysis Review",
                    "status": CycleStatus.ACTIVE,
                    "start_date": now - timedelta(days=2),
                },
                "followups": [
                    {
                        "type": FollowupType.APPOINTMENT,
                        "due_date": now + timedelta(days=1),
                        "status": FollowupStatus.PENDING,
                        "priority_score": 75,
                        "missed_reason": None,
                        "ai_metadata": {
                            "category": "couple_consultation",
                            "doctor": "Dr. Subha Fertility Specialist",
                            "eng_message": "Dear Priya & Kumar, reminder for your comprehensive consultation tomorrow at 11:00 AM.",
                        }
                    }
                ]
            },
            {
                "patient": {
                    "id": str(uuid.uuid4()),
                    "name": "Meena",
                    "phone": "+919842100004",
                    "language": "ta",
                    "district": "Coimbatore",
                    "privacy_mode": True,
                    "consent_status": True,
                    "created_at": now - timedelta(days=35),
                },
                "cycle": {
                    "stage": CycleStage.BETA_HCG,
                    "protocol": "IVF-ICSI Fresh Day-5 Blastocyst Transfer",
                    "status": CycleStatus.ACTIVE,
                    "start_date": now - timedelta(days=28),
                },
                "followups": [
                    {
                        "type": FollowupType.PREGNANCY_TEST,
                        "due_date": now - timedelta(hours=4),
                        "status": FollowupStatus.RETRY,
                        "priority_score": 98,
                        "missed_reason": "Patient missed morning lab slot due to travel delay from Pollachi",
                        "ai_metadata": {
                            "category": "quantitative_beta_hcg",
                            "tam_message": "மீனா அவர்களே, உங்கள் பீட்டா hCG இரத்தப் பரிசோதனை மிக முக்கியமானது. இன்று மாலைக்குள் அருகிலுள்ள மையத்தில் மாதிரி கொடுக்கவும்.",
                            "escalated_to": "Duty Nurse & Clinical Coordinator",
                        }
                    }
                ]
            },
            {
                "patient": {
                    "id": str(uuid.uuid4()),
                    "name": "Anitha",
                    "phone": "+919842100005",
                    "language": "ta",
                    "district": "Salem",
                    "privacy_mode": False,
                    "consent_status": True,
                    "created_at": now - timedelta(days=5),
                },
                "cycle": {
                    "stage": CycleStage.INVESTIGATION,
                    "protocol": "Pre-cycle Diagnostic Workup (AMH, AFC, Hysterosalpingography)",
                    "status": CycleStatus.ACTIVE,
                    "start_date": now - timedelta(days=4),
                },
                "followups": [
                    {
                        "type": FollowupType.INVESTIGATION,
                        "due_date": now + timedelta(days=2),
                        "status": FollowupStatus.PENDING,
                        "priority_score": 70,
                        "missed_reason": None,
                        "ai_metadata": {
                            "category": "hormonal_panel",
                            "tests": ["Serum AMH", "Thyroid Profile", "Day 3 FSH & LH"],
                            "tam_message": "வணக்கம் அனிதா, உங்கள் AMH மற்றும் ஹார்மோன் இரத்தப் பரிசோதனை விவரங்கள் பதிவு செய்யப்பட்டுள்ளன.",
                        }
                    }
                ]
            },
        ]

        print("2. Inserting demo patients, cycles, followups, and audit records...")
        for data in demo_data:
            p_dict = data["patient"]
            patient = Patient(**p_dict)
            db.add(patient)
            db.flush()

            c_dict = data["cycle"]
            cycle = Cycle(
                id=str(uuid.uuid4()),
                patient_id=patient.id,
                stage=c_dict["stage"],
                protocol=c_dict["protocol"],
                status=c_dict["status"],
                start_date=c_dict["start_date"],
            )
            db.add(cycle)
            db.flush()

            for f_dict in data["followups"]:
                followup = Followup(
                    id=str(uuid.uuid4()),
                    patient_id=patient.id,
                    cycle_id=cycle.id,
                    type=f_dict["type"],
                    due_date=f_dict["due_date"],
                    status=f_dict["status"],
                    priority_score=f_dict["priority_score"],
                    missed_reason=f_dict["missed_reason"],
                    ai_metadata=f_dict["ai_metadata"],
                )
                db.add(followup)

            # Audit record
            audit = AuditLog(
                action="SEED_DEMO_DATA",
                table_name="patients",
                record_id=patient.id,
                changed_by="system_seeder",
                changes={"name": patient.name, "district": patient.district, "stage": cycle.stage.value},
            )
            db.add(audit)

        db.commit()
        print("[SUCCESS] Successfully seeded 5 Tamil Nadu demo patients:")
        print("   1. Madhan (Tirunelveli, Tamil, Stage: embryo_transfer, Transfer completed)")
        print("   2. Lakshmi (Madurai, Tamil, Stage: ivf_stimulation)")
        print("   3. Priya & Kumar (Chennai, English, Stage: consultation)")
        print("   4. Meena (Coimbatore, Tamil, Stage: beta_hcg)")
        print("   5. Anitha (Salem, Tamil, Stage: investigation)")
        print("==================================================")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
