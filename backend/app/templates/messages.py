"""
FertiFlow AI - Clinical Message Templates (Tamil & English)
Includes Privacy-Safe Masked templates and Multilingual Action Prompts.
"""

TEMPLATES = {
    "ta": {
        "reminder_general": (
            "வணக்கம் {name} அவர்களே, {clinic_name} இலிருந்து நினைவூட்டல்.\n"
            "உங்கள் அடுத்த {stage} ஆலோசனை/பரிசோதனை {date} அன்று உள்ளது.\n\n"
            "பதிலளிக்கவும்:\n"
            "1️⃣ - வருகிறேன் (Confirm)\n"
            "2️⃣ - தேதி மாற்ற வேண்டும் (Reschedule)\n"
            "3️⃣ - உதவி தேவை (Assistance)"
        ),
        "reminder_beta_hcg": (
            "வணக்கம் {name} அவர்களே, உங்கள் கரு மாற்றத்திற்கு பிந்தைய 14-ம் நாள் சீரம் பீட்டா hCG பரிசோதனை {date} அன்று திட்டமிடப்பட்டுள்ளது. "
            "இந்த இரத்தப் பரிசோதனை மிக முக்கியமானது. காலை 8:00 - 10:00 மணிக்குள் மாதிரி கொடுக்கவும்.\n\n"
            "1 - வருகிறேன் | 2 - நேரம் மாற்றவும்"
        ),
        "reminder_medication": (
            "வணக்கம் {name}, உங்கள் கருத்தரிப்பு மருந்து ({med_name}) நேர நினைவூட்டல். "
            "மருத்துவரின் பரிந்துரைப்படி சரியான நேரத்தில் எடுத்துக்கொள்ளவும்."
        ),
        "privacy_safe": (
            "வணக்கம். உங்களுக்கு கிளினிக்கில் திட்டமிடப்பட்ட மருத்துவப் பரிசோதனை உள்ளது. விவரங்களை அறிய தயவுசெய்து பதிலளிக்கவும்."
        ),
        "confirm_ack": (
            "நன்றி {name} அவர்களே! உங்கள் சந்திப்பு {date} அன்று உறுதி செய்யப்பட்டுள்ளது. ஏதேனும் சந்தேகங்கள் இருந்தால் தெரிவிக்கவும்."
        ),
        "reschedule_slots": (
            "வணக்கம் {name}, நீங்கள் கேட்டவாறு அடுத்த கிடைக்கக்கூடிய தேதிகள்:\n"
            "{slots_text}\n"
            "தயவுசெய்து உங்கள் விருப்ப எண்ணை (1, 2 அல்லது 3) பதிலளிக்கவும்."
        ),
        "medical_escalation": (
            "வணக்கம் {name}. உங்கள் மருத்துவ வினவல் மற்றும் அறிகுறிகள் பதிவு செய்யப்பட்டுள்ளன. "
            "எங்கள் மூத்த செவிலியர் / மருத்துவர் குழுவினர் மிக விரைவில் உங்களை தொலைபேசியில் தொடர்புகொள்வார்கள்."
        ),
        "financial_support": (
            "வணக்கம் {name}, சிகிச்சை கட்டண வழிகாட்டல் மற்றும் தவணை முறை (EMI) விவரங்களுக்கு எங்கள் நிதி ஆலோசகர் உங்களை தொடர்புகொள்வார்."
        ),
    },
    "en": {
        "reminder_general": (
            "Hello {name}, reminder from {clinic_name}.\n"
            "Your upcoming {stage} follow-up is scheduled for {date}.\n\n"
            "Please reply:\n"
            "1 - Confirm\n"
            "2 - Reschedule\n"
            "3 - Need Assistance"
        ),
        "reminder_beta_hcg": (
            "Dear {name}, critical reminder: Your Day-14 Serum Beta-hCG pregnancy blood test is scheduled for {date} between 8:00 AM - 10:00 AM.\n\n"
            "Reply: 1 to Confirm | 2 to Reschedule"
        ),
        "reminder_medication": (
            "Dear {name}, timely reminder for your prescribed fertility support medication ({med_name})."
        ),
        "privacy_safe": (
            "Hello. You have an upcoming scheduled clinic appointment. Please reply to confirm."
        ),
        "confirm_ack": (
            "Thank you {name}! Your follow-up on {date} has been confirmed. We look forward to seeing you."
        ),
        "reschedule_slots": (
            "Hello {name}, here are the available alternative slots based on your request:\n"
            "{slots_text}\n"
            "Please reply with your preferred option (1, 2, or 3)."
        ),
        "medical_escalation": (
            "Dear {name}, your health query and reported symptoms have been flagged. "
            "Our clinical care team and duty doctor will contact you shortly."
        ),
        "financial_support": (
            "Dear {name}, our clinic counsellor will contact you to explain payment plans and EMI assistance options."
        ),
    }
}


def render_message(template_key: str, language: str = "ta", **kwargs) -> str:
    lang = "ta" if language == "ta" else "en"
    tmpl = TEMPLATES.get(lang, TEMPLATES["en"]).get(template_key)
    if not tmpl:
        tmpl = TEMPLATES["en"].get(template_key, "Reminder from clinic.")
    try:
        return tmpl.format(**kwargs)
    except Exception:
        return tmpl
