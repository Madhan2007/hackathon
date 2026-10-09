import logging
import requests
from typing import Dict, Any, Optional

from app.config import get_settings

logger = logging.getLogger("fertiflow.exotel")


class ExotelVoiceService:
    """
    Exotel Indian Healthcare Telephony Engine.
    Initiates real automated cellular voice calls to Indian mobile phones (+91)
    and relays events to n8n workflow engine.
    """

    @classmethod
    def initiate_patient_call(
        cls,
        patient_phone: str,
        patient_name: str,
        tamil_message: str,
        english_message: str,
        followup_id: str,
        stage: str = "IVF Care",
    ) -> Dict[str, Any]:
        """
        Dials the patient's physical phone number via Exotel REST API.
        Also triggers n8n voice webhook if configured.
        """
        settings = get_settings()

        # Sanitize phone number for Indian carrier dialing:
        # Exotel accepts E.164 (+917305708707) or 10-digit (07305708707 / 7305708707)
        clean_phone = patient_phone.replace(" ", "").replace("-", "")
        if clean_phone.startswith("+91"):
            clean_phone = clean_phone[3:]
        if clean_phone.startswith("91") and len(clean_phone) == 12:
            clean_phone = clean_phone[2:]
        if clean_phone.startswith("0") and len(clean_phone) == 11:
            clean_phone = clean_phone[1:]

        # 1. Trigger n8n voice call workflow if enabled
        n8n_dispatched = False
        if settings.N8N_ENABLED:
            try:
                n8n_payload = {
                    "event": "PATIENT_VOICE_CALL_REQUESTED",
                    "followup_id": followup_id,
                    "patient_name": patient_name,
                    "phone": patient_phone,
                    "clean_phone": clean_phone,
                    "stage": stage,
                    "tamil_message": tamil_message,
                    "english_message": english_message,
                }
                res = requests.post(
                    settings.N8N_VOICE_CALL_WEBHOOK_URL,
                    json=n8n_payload,
                    timeout=settings.N8N_WEBHOOK_TIMEOUT,
                )
                if res.status_code in [200, 201]:
                    n8n_dispatched = True
                    logger.info(f"[Exotel -> n8n] Dispatched voice call event to n8n (status={res.status_code})")
            except Exception as e:
                logger.warning(f"[Exotel -> n8n] Failed to reach n8n voice webhook: {e}")

        # 2. Exotel Outbound Voice Call Dispatch
        if settings.EXOTEL_API_KEY and settings.EXOTEL_API_TOKEN and settings.EXOTEL_ACCOUNT_SID:
            try:
                # Exotel connect endpoint
                url = f"https://api.exotel.com/v1/Accounts/{settings.EXOTEL_ACCOUNT_SID}/Calls/connect.json"
                auth = (settings.EXOTEL_API_KEY, settings.EXOTEL_API_TOKEN)
                
                # Transactional call parameters
                data = {
                    "From": f"0{clean_phone}", # Destination number
                    "To": settings.EXOTEL_CALLER_ID, # Virtual number or IVR flow
                    "CallerId": settings.EXOTEL_CALLER_ID,
                    "CallType": "trans",
                }

                logger.info(f"[Exotel] Placing live cellular call to +91 {clean_phone} via Exotel...")
                response = requests.post(url, auth=auth, data=data, timeout=10.0)

                if response.status_code == 200:
                    res_data = response.json()
                    call_sid = res_data.get("Call", {}).get("Sid")
                    logger.info(f"[Exotel] Call placed successfully to +91 {clean_phone} (CallSid={call_sid})")
                    return {
                        "success": True,
                        "status": "CALL_INITIATED",
                        "call_sid": call_sid,
                        "phone": patient_phone,
                        "provider": "Exotel",
                        "n8n_dispatched": n8n_dispatched,
                    }
                else:
                    logger.error(f"[Exotel] Exotel HTTP {response.status_code}: {response.text}")
                    return {
                        "success": False,
                        "status": "PROVIDER_ERROR",
                        "error": response.text,
                        "phone": patient_phone,
                        "provider": "Exotel",
                    }
            except Exception as e:
                logger.error(f"[Exotel] Dispatch exception: {e}")
                return {
                    "success": False,
                    "status": "DISPATCH_FAILED",
                    "error": str(e),
                    "phone": patient_phone,
                }

        # 3. Simulated Exotel Call (Ready for credentials)
        logger.info(
            f"[Exotel -> Ready] Simulated cellular voice call to +91 {clean_phone} ({patient_name}): "
            f"Add EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_CALLER_ID in backend/.env for live SIM dialing."
        )
        return {
            "success": True,
            "status": "SIMULATED",
            "message": f"Ready to dial +91 {clean_phone}. Enter Exotel credentials in backend/.env to connect to Indian telecom towers.",
            "phone": patient_phone,
            "n8n_dispatched": n8n_dispatched,
        }
