# 🤖 FertiFlow AI + n8n Integration Guide

This directory contains ready-to-import **n8n workflows** for connecting FertiFlow with live WhatsApp, multi-channel fallback, and real-time clinical doctor escalations.

---

## 🏗️ Architecture

```
                                      ┌────────────────────────────────┐
                                      │      Self-Hosted n8n (Docker)   │
                                      │                                │
📱 WhatsApp (Meta / Twilio) ──────────► Webhook: Inbound Router        │
                                      │   │                            │
                                      │   ▼                            │
                                      │ HTTP Request                   │
                                      │   │ (host.docker.internal:8000)│
                                      └─┬─┼────────────────────────────┘
                                        │ │
           ┌────────────────────────────┘ │
           │                              ▼
┌──────────▼────────────────────────────────┐
│      FertiFlow AI Core (FastAPI)          │
│                                           │
│  1. Gemini NLU & Intent Extraction        │
│  2. Clinical State Machine Transitions    │
│  3. Immutable Audit Log Trail             │
│  4. Human Exception Queue Escalation      │
└───────────────────────────────────────────┘
```

---

## 🚀 Step 1: Run n8n in Docker

To allow n8n inside Docker to communicate with your local FertiFlow FastAPI server (`localhost:8000`), run the Docker container with `host.docker.internal` mapped:

```powershell
docker run -d `
  --name fertiflow-n8n `
  -p 5678:5678 `
  --add-host=host.docker.internal:host-gateway `
  -v n8n_data:/home/node/.n8n `
  n8nio/n8n
```

Open your browser to: **`http://localhost:5678`**

---

## 📂 Step 2: Import Workflows into n8n

In your n8n dashboard:
1. Click **Workflows** in the left sidebar.
2. Click **Add workflow** (top right) $\rightarrow$ click the **`...`** (options menu) $\rightarrow$ **Import from File**.
3. Import each file from this folder:
   - [`fertiflow_whatsapp_inbound_workflow.json`](./fertiflow_whatsapp_inbound_workflow.json): **Inbound Patient Messages & NLU Router**
   - [`fertiflow_outbound_reminders_workflow.json`](./fertiflow_outbound_reminders_workflow.json): **Outbound Appointment / Medication Reminders**
   - [`fertiflow_doctor_escalation_workflow.json`](./fertiflow_doctor_escalation_workflow.json): **Urgent Doctor & Nurse Clinical Alerts**
4. Click **Publish / Activate** on each workflow.

---

## ⚙️ Step 3: Enable n8n in FertiFlow Backend

Open [`backend/.env`](../backend/.env) and set:

```env
# Enable n8n dispatch
N8N_ENABLED=true
N8N_OUTBOUND_WEBHOOK_URL=http://localhost:5678/webhook/fertiflow-outbound
N8N_DOCTOR_ALERT_WEBHOOK_URL=http://localhost:5678/webhook/fertiflow-doctor-alert
```

Restart your FertiFlow FastAPI backend:
```powershell
cd backend
.\venv\Scripts\uvicorn app.main:app --reload --port 8000
```

---

## 🧪 Step 4: Test the Workflows

### Test 1: Inbound WhatsApp Patient Message (Tamil Reschedule)

Send a POST request to your n8n inbound webhook:

```powershell
curl -X POST http://localhost:5678/webhook/fertiflow-inbound-wa `
  -H "Content-Type: application/json" `
  -d '{"phone": "+919876543210", "message": "நாளைக்கு வர முடியாது, வெள்ளிக்கிழமை வரலாமா?"}'
```

**What happens:**
1. n8n extracts the phone and message.
2. n8n calls FertiFlow `POST http://host.docker.internal:8000/api/v1/webhooks/whatsapp`.
3. Gemini NLU parses intent as `RESCHEDULE_REQUEST`.
4. Clinical state machine reserves the preferred slot and generates a Tamil confirmation reply.
5. n8n returns the structured response back to the patient.

---

### Test 2: Urgent Medical Escalation Guardrail

Send a severe symptom message:

```powershell
curl -X POST http://localhost:5678/webhook/fertiflow-inbound-wa `
  -H "Content-Type: application/json" `
  -d '{"phone": "+919876543210", "message": "எனக்கு கடும் வயிற்று வலி மற்றும் வாந்தி மயக்கம் உள்ளது"}'
```

**What happens:**
1. Gemini NLU identifies `MEDICAL_QUESTION` / `ESCALATE` with severe OHSS risk symptoms.
2. FertiFlow transitions follow-up to `ESCALATED` state.
3. n8n detects `MEDICAL_ESCALATION_TRIGGERED` and automatically branches to the **Format Doctor Alert** node.
4. An emergency alert is formatted for on-duty fertility specialist **Dr. Subha** and clinical nurses.

---

## 🌐 Connecting Real WhatsApp (Meta Cloud API)

When you're ready to use live WhatsApp numbers instead of the local test payload:
1. In Meta Developer Console, create a WhatsApp Business App and get your **Phone Number ID** and **Access Token**.
2. Set your Meta Webhook callback URL to:
   `https://<your-ngrok-or-public-domain>/webhook/fertiflow-inbound-wa`
3. Add the official **WhatsApp** node in n8n in place of the response node to send live WhatsApp text templates directly to patients.
