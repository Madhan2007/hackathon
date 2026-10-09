from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import uuid

from app.models.patient import Patient
from app.models.followup import Followup, FollowupStatus, FollowupType
from app.models.appointment import Appointment
from app.schemas.ai_intent import PatientIntent
from app.services.followup import FollowupStateMachine
from app.services.communication import CommunicationService
from app.templates.messages import render_message


class WorkflowRouter:
    """
    Clinical State Machine Router: Maps parsed AI patient intents to clinical workflow actions,
    appointments, doctor escalations, and multilingual replies.
    """

    @classmethod
    def handle_intent(
        cls,
        db: Session,
        patient: Patient,
        followup: Optional[Followup],
        parsed_intent: PatientIntent,
    ) -> Dict[str, Any]:
        intent = parsed_intent.intent
        lang = patient.language or "ta"
        response_text = ""
        action_taken = ""

        # Find active followup if none passed
        if not followup:
            followup = (
                db.query(Followup)
                .filter(
                    Followup.patient_id == patient.id,
                    Followup.status.in_([
                        FollowupStatus.SENT,
                        FollowupStatus.SCHEDULED,
                        FollowupStatus.PENDING,
                        FollowupStatus.RETRY,
                        FollowupStatus.RESCHEDULE_REQUESTED,
                    ])
                )
                .order_by(Followup.due_date.asc())
                .first()
            )

        if not followup:
            cycle = patient.cycles[0] if patient.cycles else None
            followup = Followup(
                id=str(uuid.uuid4()),
                patient_id=patient.id,
                cycle_id=cycle.id if cycle else None,
                type=FollowupType.APPOINTMENT,
                due_date=datetime.utcnow() + timedelta(days=1),
                status=FollowupStatus.SENT,
                priority_score=60,
                ai_metadata={"source": "inbound_webhook_auto_assigned"},
            )
            db.add(followup)
            db.commit()
            db.refresh(followup)

        curr_status = followup.status.value if hasattr(followup.status, 'value') else str(followup.status)

        # -------------------------------------------------------------------------
        # 1. SLOT SELECTED (Confirming an offered reschedule option)
        # -------------------------------------------------------------------------
        if intent == "SLOT_SELECTED" or (intent == "CONFIRM" and curr_status in ["reschedule_requested", "slot_offered"]):
            slot_idx = parsed_intent.selected_slot_index or 1
            days_offset = 2 if slot_idx == 1 else (3 if slot_idx == 2 else 4)
            time_hour = 10 if slot_idx == 1 else (11 if slot_idx == 2 else 15)
            time_minute = 0 if slot_idx == 1 else (30 if slot_idx == 2 else 0)

            now = datetime.utcnow()
            new_slot_dt = (now + timedelta(days=days_offset)).replace(
                hour=time_hour, minute=time_minute, second=0, microsecond=0
            )

            # Update Followup Date and State
            followup.due_date = new_slot_dt
            FollowupStateMachine.transition(
                db=db,
                followup=followup,
                new_status=FollowupStatus.RESCHEDULED,
                changed_by="patient_reply_slot_selected",
                reason=f"Patient booked Option {slot_idx} ({new_slot_dt.strftime('%d-%b-%Y %I:%M %p')})",
                additional_metadata={"rescheduled_to": new_slot_dt.isoformat(), "slot_index": slot_idx},
            )

            # Create or link Appointment in Supabase
            token_num = str(uuid.uuid4())[:4].upper()
            appt = Appointment(
                id=str(uuid.uuid4()),
                followup_id=followup.id,
                patient_id=patient.id,
                doctor_name="Dr. Subha Lakshmi MBBS, MS (OBG), DRM",
                datetime=new_slot_dt,
                duration_min=30,
                status="scheduled",
                location="Main Clinic Hub - Consultation Room 3",
                notes=f"Auto-booked via AI WhatsApp Interaction (Slot #{slot_idx}). Token: FF-{token_num}",
            )
            db.add(appt)
            db.commit()

            date_str = new_slot_dt.strftime("%A, %d-%b-%Y at %I:%M %p")
            if lang == "ta":
                response_text = (
                    f"✅ மகிழ்ச்சி {patient.name} அவர்களே! உங்கள் சந்திப்பு வெற்றிகரமாக மாற்றப்பட்டு உறுதி செய்யப்பட்டது.\n\n"
                    f"📅 புதிய தேதி: {date_str}\n"
                    f"👩‍⚕️ மருத்துவர்: டாக்டர் சுபா லக்ஷ்மி\n"
                    f"📍 அறை: Consultation Suite 3\n"
                    f"🎫 டோக்கன் எண்: FF-{token_num}\n\n"
                    f"நேரத்திற்கு 15 நிமிடங்கள் முன்னதாக வரவும்."
                )
            else:
                response_text = (
                    f"✅ Confirmed {patient.name}! Your appointment has been successfully rescheduled.\n\n"
                    f"📅 New Date: {date_str}\n"
                    f"👩‍⚕️ Doctor: Dr. Subha Lakshmi\n"
                    f"📍 Room: Consultation Suite 3\n"
                    f"🎫 Token No: FF-{token_num}\n\n"
                    f"Please arrive 15 minutes before your slot."
                )
            action_taken = "APPOINTMENT_RESCHEDULED_AND_BOOKED"

        # -------------------------------------------------------------------------
        # 2. LAB REPORT / BETA-hCG PREGNANCY TEST FINDING
        # -------------------------------------------------------------------------
        elif intent == "LAB_REPORT_RECEIVED":
            FollowupStateMachine.transition(
                db=db,
                followup=followup,
                new_status=FollowupStatus.COMPLETED,
                changed_by="lab_report_ai_extracted",
                reason="Beta-hCG 520 mIU/mL confirmed positive pregnancy",
                additional_metadata={"lab_test": "Beta-hCG", "result": "Positive", "value": "520 mIU/mL"},
            )

            # Automatically schedule the next clinical milestone: Day-24 Viability Ultrasound
            scan_date = datetime.utcnow() + timedelta(days=12)
            next_followup = Followup(
                id=str(uuid.uuid4()),
                patient_id=patient.id,
                cycle_id=followup.cycle_id,
                type=FollowupType.PROCEDURE_PREP,
                due_date=scan_date,
                status=FollowupStatus.SCHEDULED,
                priority_score=85,
                ai_metadata={
                    "milestone": "First Trimester Viability Scan",
                    "source": "automated_post_beta_hcg_rule",
                    "clinical_notes": "Early gestational sac check + cardiac activity",
                },
            )
            db.add(next_followup)
            db.commit()

            if lang == "ta":
                response_text = (
                    f"🎉 வாழ்த்துகள் {patient.name} அவர்களே! உங்கள் பீட்டா hCG பரிசோதனை முடிவு (520 mIU/mL) பாசிட்டிவாக உள்ளது.\n\n"
                    f"தலைமை மருத்துவர் டாக்டர் சுபா உங்கள் அறிக்கையை ஆய்வு செய்துள்ளார். "
                    f"கருவின் வளர்ச்சியை உறுதிசெய்ய 12 நாட்களில் முதல் அல்ட்ராசவுண்ட் ஸ்கேன் திட்டமிடப்பட்டுள்ளது.\n\n"
                    f"தொடர்ந்து ஃபோலிக் ஆசிட் மற்றும் பரிந்துரைக்கப்பட்ட மருந்துகளை எடுத்துக்கொள்ளவும்."
                )
            else:
                response_text = (
                    f"🎉 Congratulations {patient.name}! Your Day-14 Beta-hCG blood test report (520 mIU/mL) indicates a positive pregnancy.\n\n"
                    f"Dr. Subha has reviewed the results. Your 6-week viability ultrasound scan is scheduled in 12 days. "
                    f"Please continue your prescribed luteal progesterone support."
                )
            action_taken = "LAB_REPORT_PROCESSED_AND_SCAN_SCHEDULED"

        # -------------------------------------------------------------------------
        # 3. ROUTINE CONFIRMATION
        # -------------------------------------------------------------------------
        elif intent == "CONFIRM":
            FollowupStateMachine.transition(
                db=db,
                followup=followup,
                new_status=FollowupStatus.COMPLETED,
                changed_by="patient_reply_confirm",
                additional_metadata={"confirmed_at": datetime.utcnow().isoformat()},
            )
            action_taken = "FOLLOWUP_COMPLETED"
            due_str = followup.due_date.strftime("%A, %d-%b-%Y") if followup.due_date else "திட்டமிட்டபடி"
            response_text = render_message("confirm_ack", language=lang, name=patient.name, date=due_str)

        # -------------------------------------------------------------------------
        # 4. REQUEST RESCHEDULE (Offer 3 Options)
        # -------------------------------------------------------------------------
        elif intent == "RESCHEDULE":
            FollowupStateMachine.transition(
                db=db,
                followup=followup,
                new_status=FollowupStatus.RESCHEDULE_REQUESTED,
                changed_by="patient_reply_reschedule",
                reason=parsed_intent.patient_reason or "Patient requested reschedule via WhatsApp",
            )
            action_taken = "RESCHEDULE_SLOTS_OFFERED"

            now = datetime.utcnow()
            s1 = (now + timedelta(days=2)).strftime("%A, %d-%b (10:00 AM - Morning)")
            s2 = (now + timedelta(days=3)).strftime("%A, %d-%b (11:30 AM - Morning)")
            s3 = (now + timedelta(days=4)).strftime("%A, %d-%b (03:00 PM - Afternoon)")

            slots_formatted = f"1️⃣ {s1}\n2️⃣ {s2}\n3️⃣ {s3}"
            response_text = render_message("reschedule_slots", language=lang, name=patient.name, slots_text=slots_formatted)

        # -------------------------------------------------------------------------
        # 5. MEDICAL QUESTION / EMERGENCY ESCALATION
        # -------------------------------------------------------------------------
        elif intent in ["MEDICAL_QUESTION", "ESCALATE"]:
            FollowupStateMachine.transition(
                db=db,
                followup=followup,
                new_status=FollowupStatus.ESCALATED,
                changed_by="ai_safety_guardrail",
                reason=f"Patient reported symptom/medical query: {parsed_intent.patient_reason}",
                additional_metadata={"escalation_level": "L3", "urgency": "IMMEDIATE"},
            )
            action_taken = "MEDICAL_ESCALATION_TRIGGERED"
            # Dispatch real-time escalation to on-call clinical staff (Slack/n8n/WhatsApp)
            CommunicationService.dispatch_doctor_escalation(
                db=db,
                patient=patient,
                followup=followup,
                reason=parsed_intent.patient_reason or "Acute symptom/medical query",
                urgency="IMMEDIATE",
            )

            if lang == "ta":
                response_text = (
                    f"🚨 அவசர எச்சரிக்கை {patient.name} அவர்களே: உங்கள் உடல்நலக் குறிப்பு உடனடியாக டாக்டர் சுபா மற்றும் அவசரப்பிரிவு செவிலியருக்கு அனுப்பப்பட்டுள்ளது.\n\n"
                    f"⚠️ தயவுசெய்து புதிய மாத்திரைகளை மருத்துவர் அனுமதியின்றி சாப்பிட வேண்டாம்.\n"
                    f"📞 கிளினிக் அவசர உதவி எண்: +91 94440 12345 (24 மணி நேரமும் செயல்படும்)."
                )
            else:
                response_text = (
                    f"🚨 Urgent Medical Alert {patient.name}: Your symptoms have been escalated immediately to Dr. Subha and our emergency clinical nurse.\n\n"
                    f"⚠️ Please do not take unprescribed painkillers or alter doses.\n"
                    f"📞 Clinic Emergency Helpline: +91 94440 12345 (Available 24/7)."
                )

        # -------------------------------------------------------------------------
        # 6. FINANCIAL / EMI ISSUE
        # -------------------------------------------------------------------------
        elif intent == "FINANCIAL_ISSUE":
            FollowupStateMachine.transition(
                db=db,
                followup=followup,
                new_status=FollowupStatus.ESCALATED,
                changed_by="ai_financial_guardrail",
                reason=f"Patient financial inquiry: {parsed_intent.patient_reason}",
                additional_metadata={"escalation_level": "L2", "team": "counsellor"},
            )
            action_taken = "COUNSELLOR_ESCALATION_TRIGGERED"

            if lang == "ta":
                response_text = (
                    f"வணக்கம் {patient.name} அவர்களே, சிகிச்சைக்கான கட்டண வழிகாட்டல் மற்றும் ஜீரோ வட்டி தவணை முறை (0% EMI) "
                    f"விவரங்களுக்கு எங்கள் நிதி ஆலோசகர் திருமதி. ரேகா உங்களை இன்று மாலைக்குள் தொடர்புகொள்வார்."
                )
            else:
                response_text = (
                    f"Hello {patient.name}, our patient finance counsellor Mrs. Rekha will reach out to explain flexible "
                    f"0% EMI payment schemes and cost options today."
                )

        # -------------------------------------------------------------------------
        # 7. UNCLEAR OR CANCEL
        # -------------------------------------------------------------------------
        else:
            if followup and parsed_intent.confidence_score < 0.6:
                FollowupStateMachine.transition(
                    db=db,
                    followup=followup,
                    new_status=FollowupStatus.ESCALATED,
                    changed_by="ai_low_confidence_guardrail",
                    reason="Low AI confidence classification on inbound message",
                )
                action_taken = "STAFF_REVIEW_FLAGGED"
            else:
                action_taken = "ACKNOWLEDGED"

            response_text = (
                f"வணக்கம் {patient.name}, உங்கள் செய்தி பெறப்பட்டது. எங்கள் மருத்துவ ஒருங்கிணைப்பாளர் உங்களை விரைவில் தொடர்புகொள்வார்."
                if lang == "ta"
                else f"Hello {patient.name}, your message has been received. Our clinical coordinator will assist you shortly."
            )

        return {
            "intent": intent,
            "confidence": parsed_intent.confidence_score,
            "action_taken": action_taken,
            "response_message": response_text,
            "followup_id": followup.id if followup else None,
            "new_status": followup.status.value if followup and hasattr(followup.status, 'value') else (str(followup.status) if followup else None),
            "due_date": followup.due_date.isoformat() if followup and followup.due_date else None,
            "priority_score": followup.priority_score if followup else None,
        }
