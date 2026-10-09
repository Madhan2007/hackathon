from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import uuid

from app.models.cycle import Cycle, CycleStage
from app.models.patient import Patient
from app.models.followup import Followup, FollowupType, FollowupStatus
from app.services.priority import PriorityScorer


class StageRulesEngine:
    """
    Stage transition and clinical event rules engine.
    Automatically generates required clinical follow-up tasks and personalized Tamil/English notifications.
    """

    @classmethod
    def generate_followups_for_event(
        cls,
        patient: Patient,
        cycle: Cycle,
        event_type: str,
        note: Optional[str] = None,
        custom_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Followup]:
        """
        Evaluate clinical event and return newly generated Followup model instances.
        """
        now = datetime.utcnow()
        lang = patient.language or "ta"
        followups: List[Followup] = []
        meta = custom_metadata or {}

        event_upper = event_type.upper()

        if event_upper in ["EMBRYO_TRANSFER_COMPLETED", "EMBRYO_TRANSFER"]:
            # 1. Beta-hCG Blood Test (14 days later) - Urgency: 100
            due_hcg = now + timedelta(days=14)
            tam_hcg = f"வணக்கம் {patient.name} அவர்களே, உங்கள் கரு மாற்றத்திற்கு பிந்தைய 14-ம் நாள் சீரம் பீட்டா hCG இரத்தப் பரிசோதனை நாள் இதுவாகும்."
            eng_hcg = f"Dear {patient.name}, reminder for your Day-14 Serum Beta-hCG blood test after Embryo Transfer."

            followups.append(
                Followup(
                    id=str(uuid.uuid4()),
                    patient_id=patient.id,
                    cycle_id=cycle.id,
                    type=FollowupType.PREGNANCY_TEST,
                    due_date=due_hcg,
                    status=FollowupStatus.SCHEDULED,
                    priority_score=100,
                    ai_metadata={
                        "event_trigger": event_upper,
                        "category": "beta_hcg_confirmation",
                        "tam_message": tam_hcg,
                        "eng_message": eng_hcg,
                        "recommended_channel": "whatsapp",
                        **meta,
                    },
                )
            )

            # 2. Luteal Phase Progesterone Medication Reminder (due in 6 hours)
            due_med = now + timedelta(hours=6)
            tam_med = f"வணக்கம் {patient.name}, உங்கள் கரு மாற்றத்திற்கு பிந்தைய புரோஜெஸ்ட்டிரோன் மருந்துகளை தவறாமல் உட்கொள்ளவும்."
            eng_med = f"Dear {patient.name}, reminder to take your post-embryo transfer progesterone support on time."

            followups.append(
                Followup(
                    id=str(uuid.uuid4()),
                    patient_id=patient.id,
                    cycle_id=cycle.id,
                    type=FollowupType.MEDICATION,
                    due_date=due_med,
                    status=FollowupStatus.SCHEDULED,
                    priority_score=PriorityScorer.calculate_score(
                        FollowupType.MEDICATION, due_med, CycleStage.EMBRYO_TRANSFER
                    ),
                    ai_metadata={
                        "event_trigger": event_upper,
                        "category": "luteal_support",
                        "medication_name": "Progesterone Gel 8% / Micronized Progesterone",
                        "tam_message": tam_med,
                        "eng_message": eng_med,
                        **meta,
                    },
                )
            )

        elif event_upper in ["IVF_STIMULATION_STARTED", "STIMULATION_START"]:
            # Follicular Scan Follow-up in 4 days
            due_scan = now + timedelta(days=4)
            tam_scan = f"வணக்கம் {patient.name}, உங்கள் தூண்டுதல் சுழற்சியின் முதல் ஃபோலிகுலர் கண்காணிப்பு ஸ்கேன் 4 நாட்களில் திட்டமிடப்பட்டுள்ளது."
            eng_scan = f"Dear {patient.name}, your Day-5 Follicular Monitoring Ultrasound is scheduled in 4 days."

            followups.append(
                Followup(
                    id=str(uuid.uuid4()),
                    patient_id=patient.id,
                    cycle_id=cycle.id,
                    type=FollowupType.INVESTIGATION,
                    due_date=due_scan,
                    status=FollowupStatus.SCHEDULED,
                    priority_score=PriorityScorer.calculate_score(
                        FollowupType.INVESTIGATION, due_scan, CycleStage.IVF_STIMULATION
                    ),
                    ai_metadata={
                        "event_trigger": event_upper,
                        "scan_type": "Day 5 TVS Follicular Scan",
                        "tam_message": tam_scan,
                        "eng_message": eng_scan,
                        **meta,
                    },
                )
            )

        elif event_upper in ["EGG_RETRIEVAL_COMPLETED", "OPU_COMPLETED"]:
            # Next day fertilization status call
            due_fert = now + timedelta(days=1)
            tam_fert = f"வணக்கம் {patient.name}, உங்கள் முட்டை மீட்பிற்குப் பிந்தைய கருத்தரித்தல் நிலை பற்றிய அறிக்கை நாளை பகிரப்படும்."
            eng_fert = f"Dear {patient.name}, your embryology fertilization report will be reviewed tomorrow."

            followups.append(
                Followup(
                    id=str(uuid.uuid4()),
                    patient_id=patient.id,
                    cycle_id=cycle.id,
                    type=FollowupType.APPOINTMENT,
                    due_date=due_fert,
                    status=FollowupStatus.SCHEDULED,
                    priority_score=PriorityScorer.calculate_score(
                        FollowupType.APPOINTMENT, due_fert, CycleStage.EGG_RETRIEVAL
                    ),
                    ai_metadata={
                        "event_trigger": event_upper,
                        "category": "embryology_fertilization_review",
                        "tam_message": tam_fert,
                        "eng_message": eng_fert,
                        **meta,
                    },
                )
            )

        elif event_upper in ["CONSULTATION_COMPLETED", "STAGE_TRANSITION"]:
            # Investigation follow-up (+3 days)
            due_inv = now + timedelta(days=3)
            tam_inv = f"வணக்கம் {patient.name}, உங்கள் ஆரம்ப மருத்துவ ஆலோசனைக்கு நன்றி. உங்கள் இரத்த மற்றும் அல்ட்ராசவுண்ட் பரிசோதனைகள் பதிவு செய்யப்பட்டுள்ளன."
            eng_inv = f"Dear {patient.name}, thank you for your consultation. Please complete your prescribed baseline investigations."

            followups.append(
                Followup(
                    id=str(uuid.uuid4()),
                    patient_id=patient.id,
                    cycle_id=cycle.id,
                    type=FollowupType.INVESTIGATION,
                    due_date=due_inv,
                    status=FollowupStatus.PENDING,
                    priority_score=60,
                    ai_metadata={
                        "event_trigger": event_upper,
                        "category": "baseline_investigations",
                        "tam_message": tam_inv,
                        "eng_message": eng_inv,
                        **meta,
                    },
                )
            )

        return followups
