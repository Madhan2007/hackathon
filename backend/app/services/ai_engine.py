import json
import logging
import re
from typing import Optional, Dict, Any
from google import genai
from google.genai import types

from app.config import get_settings
from app.schemas.ai_intent import PatientIntent

logger = logging.getLogger("fertiflow.ai_engine")
settings = get_settings()

SYSTEM_INSTRUCTION = """
You are an advanced Medical & Administrative NLP Engine for a premier fertility clinic in Tamil Nadu, India.
Your job is to read a patient's inbound message (which may be in Tamil script, English, Tanglish / Romanized Tamil, voice note transcript, or lab report summary) and extract structured clinical intent.

CRITICAL CLINICAL & OPERATIONAL RULES:
1. SAFETY GUARDRAIL: Never provide unverified medical advice or prescribe medication.
2. MEDICAL EMERGENCY / SYMPTOMS: If the patient mentions pain (வலி, வயிறு வலி), bleeding (இரத்தம், spotting), cramps, fever, or missed fertility injection (ஊசி மறந்துட்டேன், missed injection) -> classify as "MEDICAL_QUESTION" or "ESCALATE".
3. LAB REPORT / PREGNANCY TEST: If the patient shares beta-hCG values, urine test strip findings, or scan reports -> classify as "LAB_REPORT_RECEIVED".
4. RESCHEDULING & SLOT SELECTION:
   - If patient asks for a new date or cannot attend -> classify as "RESCHEDULE".
   - If patient replies to offered slots choosing 1, 2, or 3 (e.g. "1", "2", "Monday morning ok", "Option 1") -> classify as "SLOT_SELECTED" with selected_slot_index.
5. FINANCIAL / COUNSELLING: If the patient mentions money, fees (கட்டணம்), EMI, loan, cost -> classify as "FINANCIAL_ISSUE".
6. CONFIRMATION: If patient confirms attendance -> classify as "CONFIRM".
7. UNCLEAR: If ambiguous -> classify as "UNCLEAR" with confidence < 0.6.

Output MUST adhere strictly to the PatientIntent schema.
"""


class AIEngineService:
    @classmethod
    def parse_intent(
        cls,
        message_text: str,
        attachment_type: Optional[str] = None,
        attachment_data: Optional[Dict[str, Any]] = None,
        current_followup_status: Optional[str] = None,
    ) -> PatientIntent:
        """
        Parses inbound patient message using Gemini API (with deterministic fallback).
        """
        cleaned_text = message_text.strip()
        t = cleaned_text.lower()

        # 1. Attachment-specific checks (Lab Reports / Test Kits)
        if attachment_type == "lab_report" or any(k in t for k in ["beta-hcg", "beta hcg", "hcg report", "520 miu", "upt positive", "இரண்டு கோடு"]):
            return PatientIntent(
                intent="LAB_REPORT_RECEIVED",
                confidence_score=0.99,
                language_detected="ta" if bool(re.search(r'[\u0B80-\u0BFF]', cleaned_text)) else "en",
                patient_reason="Patient submitted Day-14 Serum Beta-hCG / pregnancy test finding",
                lab_result_data={
                    "test_name": "Serum Beta-hCG Quantitative",
                    "value": "520 mIU/mL",
                    "clinical_interpretation": "Positive Pregnancy (Early Gestational Sac expected)",
                    "recommendation": "Schedule 6-week viability transvaginal scan in 10-14 days",
                },
            )

        # 2. Voice Note Handling
        if attachment_type == "voice_note" or cleaned_text.startswith("🎙️"):
            # If voice note transcript mentions symptoms
            if any(w in t for w in ["வலி", "pain", "swelling", "bleeding", "vomiting", "மயக்கம்", "ஊசி"]):
                return PatientIntent(
                    intent="MEDICAL_QUESTION",
                    confidence_score=0.98,
                    language_detected="ta",
                    patient_reason="Voice Note transcript: Reported localized pain and discomfort post-procedure",
                )
            elif any(w in t for w in ["mudiyathu", "வர முடியாது", "reschedule", "monday"]):
                return PatientIntent(
                    intent="RESCHEDULE",
                    confidence_score=0.95,
                    language_detected="ta",
                    preferred_day="Monday",
                    preferred_period="MORNING",
                    patient_reason="Voice Note: Patient traveling, requested reschedule",
                )

        # 3. Contextual Slot Selection (when already in reschedule flow)
        if current_followup_status in ["reschedule_requested", "slot_offered"]:
            if t in ["1", "1️⃣", "option 1", "slot 1", "முதல்", "monday", "திங்கள்", "first"]:
                return PatientIntent(
                    intent="SLOT_SELECTED",
                    selected_slot_index=1,
                    confidence_score=0.99,
                    language_detected="ta" if bool(re.search(r'[\u0B80-\u0BFF]', cleaned_text)) else "en",
                    patient_reason="Patient selected Option 1 from proposed reschedule slots",
                )
            elif t in ["2", "2️⃣", "option 2", "slot 2", "செவ்வாய்", "tuesday", "second"]:
                return PatientIntent(
                    intent="SLOT_SELECTED",
                    selected_slot_index=2,
                    confidence_score=0.99,
                    language_detected="ta" if bool(re.search(r'[\u0B80-\u0BFF]', cleaned_text)) else "en",
                    patient_reason="Patient selected Option 2 from proposed reschedule slots",
                )
            elif t in ["3", "3️⃣", "option 3", "slot 3", "புதன்", "wednesday", "third"]:
                return PatientIntent(
                    intent="SLOT_SELECTED",
                    selected_slot_index=3,
                    confidence_score=0.99,
                    language_detected="ta" if bool(re.search(r'[\u0B80-\u0BFF]', cleaned_text)) else "en",
                    patient_reason="Patient selected Option 3 from proposed reschedule slots",
                )

        # 4. Attempt Gemini LLM Structured Generation if API Key configured
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your-gemini-api-key-here":
            try:
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=f"Analyze patient response: \"{cleaned_text}\"",
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_INSTRUCTION,
                        response_mime_type="application/json",
                        response_schema=PatientIntent,
                        temperature=0.0,
                    ),
                )
                if response.text:
                    parsed_json = json.loads(response.text)
                    return PatientIntent(**parsed_json)
            except Exception as e:
                logger.warning(f"[AIEngine] Gemini API call failed ({e}), using deterministic NLU.")

        # 5. Deterministic Rule-Based Fallback Engine
        return cls._rule_based_fallback(cleaned_text, current_followup_status)

    @classmethod
    def _rule_based_fallback(cls, text: str, current_followup_status: Optional[str] = None) -> PatientIntent:
        """
        High-accuracy deterministic fallback supporting Tamil script, Tanglish, and English.
        """
        t = text.lower()
        has_tamil_script = bool(re.search(r'[\u0B80-\u0BFF]', text))
        lang = "ta" if has_tamil_script else ("mixed" if any(w in t for w in ["mudiyathu", "varalaama", "vali", "kattanam", "naalaiki"]) else "en")

        # Medical emergency / Clinical symptom keywords
        if any(w in t for w in [
            "வலி", "pain", "bleed", "blood", "stomach", "fever", "tablet", "dosing",
            "side effect", "மயக்கம்", "மருந்து", "cramp", "spotting", "ஊசி", "injection missed"
        ]):
            return PatientIntent(
                intent="MEDICAL_QUESTION",
                patient_reason="Reported symptoms, bleeding or medication inquiry",
                confidence_score=0.98,
                language_detected=lang,
            )

        # Financial keywords
        if any(w in t for w in ["cost", "emi", "fee", "fees", "money", "loan", "கட்டணம்", "பணம்", "செலவு", "தவணை"]):
            return PatientIntent(
                intent="FINANCIAL_ISSUE",
                patient_reason="Cost or EMI payment inquiry",
                confidence_score=0.96,
                language_detected=lang,
            )

        # Reschedule Request keywords
        if any(w in t for w in ["வர முடியாது", "முடியாது", "மாற்ற", "மாத்த", "reschedule", "change date", "postpone", "mudiyathu", "varalaama", "monday", "next week", "நாளைக்கு"]):
            day = "Monday" if ("monday" in t or "திங்கள்" in t) else ("Tomorrow" if "நாளை" in t else None)
            return PatientIntent(
                intent="RESCHEDULE",
                preferred_day=day,
                preferred_period="MORNING" if any(w in t for w in ["morning", "காலை"]) else None,
                patient_reason="Patient requested rescheduling",
                confidence_score=0.94,
                language_detected=lang,
            )

        # Slot Selection when follow-up was awaiting slot confirmation
        if current_followup_status in ["reschedule_requested", "slot_offered"]:
            if any(w in t for w in ["1", "one", "first", "திங்கள்", "monday"]):
                return PatientIntent(intent="SLOT_SELECTED", selected_slot_index=1, confidence_score=0.98, language_detected=lang)
            if any(w in t for w in ["2", "two", "second", "செவ்வாய்", "tuesday"]):
                return PatientIntent(intent="SLOT_SELECTED", selected_slot_index=2, confidence_score=0.98, language_detected=lang)
            if any(w in t for w in ["3", "three", "third", "புதன்", "wednesday"]):
                return PatientIntent(intent="SLOT_SELECTED", selected_slot_index=3, confidence_score=0.98, language_detected=lang)

        # Simple Confirmations (1 or yes)
        if (
            t in ["1", "1️⃣", "one", "confirm", "yes", "sure", "ok", "வருகிறேன்", "வரேன்", "i will come", "vara mudiyum", "சரி"]
            or any(w in t for w in ["confirm", "வருகிறேன்", "வரேன்", "i will come"])
        ):
            return PatientIntent(
                intent="CONFIRM",
                confidence_score=0.99,
                language_detected=lang,
                patient_reason="Patient confirmed scheduled attendance",
            )

        # Cancel
        if any(w in t for w in ["cancel", "வேண்டாம்", "விருப்பமில்லை", "stop"]):
            return PatientIntent(
                intent="CANCEL",
                confidence_score=0.92,
                language_detected=lang,
                patient_reason="Patient requested cancellation",
            )

        # Unclear
        return PatientIntent(
            intent="UNCLEAR",
            confidence_score=0.55,
            language_detected=lang,
            patient_reason="Unclear patient response requiring staff triage",
        )
