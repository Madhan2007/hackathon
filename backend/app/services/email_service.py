import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from typing import Dict, Any, Optional

from app.config import get_settings

logger = logging.getLogger("fertiflow.email")


class EmailService:
    @classmethod
    def generate_reminder_html(
        cls,
        patient_name: str,
        stage: str,
        due_date: str,
        tamil_message: str,
        english_message: str,
        priority_score: int,
    ) -> str:
        """Generates an enterprise-grade responsive HTML clinical reminder email."""
        return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FertiFlow AI Clinical Reminder</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 24px; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
    .header {{ background: linear-gradient(135deg, #0d9488 0%, #0284c7 100%); padding: 28px; text-align: center; }}
    .header h1 {{ margin: 0; font-size: 24px; color: #ffffff; font-weight: 800; letter-spacing: -0.5px; }}
    .header p {{ margin: 6px 0 0 0; color: #ccfbf1; font-size: 13px; font-weight: 500; }}
    .body {{ padding: 28px; }}
    .badge-bar {{ display: flex; justify-content: space-between; margin-bottom: 20px; }}
    .badge {{ display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }}
    .badge-stage {{ background: rgba(13, 148, 136, 0.2); color: #2dd4bf; border: 1px solid rgba(13, 148, 136, 0.4); }}
    .badge-priority {{ background: rgba(244, 63, 94, 0.2); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.4); }}
    .card {{ background: #1e293b; border-radius: 12px; padding: 18px; margin-bottom: 18px; border-left: 4px solid #0d9488; }}
    .card-title {{ font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; }}
    .card-content {{ font-size: 15px; color: #f8fafc; line-height: 1.6; margin: 0; }}
    .tamil-box {{ background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.25); border-left: 4px solid #6366f1; }}
    .btn {{ display: inline-block; background: #0d9488; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 14px; text-align: center; margin-top: 10px; }}
    .footer {{ padding: 20px 28px; background: #0f172a; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; line-height: 1.5; }}
    .alert-notice {{ background: rgba(225, 29, 72, 0.1); border: 1px solid rgba(225, 29, 72, 0.3); border-radius: 8px; padding: 12px; margin-top: 20px; font-size: 12px; color: #fda4af; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌸 FertiFlow AI Clinic</h1>
      <p>Continuous Clinical Care & Fertility Orchestration Engine</p>
    </div>
    <div class="body">
      <div class="badge-bar">
        <span class="badge badge-stage">Stage: {stage.replace('_', ' ').upper()}</span>
        <span class="badge badge-priority">Urgency Score: {priority_score}/100</span>
      </div>

      <p style="font-size: 16px; margin-top: 0;">Dear <strong>{patient_name}</strong>,</p>
      <p style="color: #94a3b8; font-size: 14px;">Here is your scheduled clinical protocol follow-up reminder for <strong>{due_date}</strong>:</p>

      <!-- English Personalized Message -->
      <div class="card">
        <div class="card-title">Clinical Protocol Guidance (English)</div>
        <p class="card-content">{english_message}</p>
      </div>

      <!-- Tamil Personalized Message -->
      <div class="card tamil-box">
        <div class="card-title" style="color: #818cf8;">மருத்துவ நினைவூட்டல் (தமிழ்)</div>
        <p class="card-content" style="color: #e0e7ff;">{tamil_message}</p>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 24px 0 10px 0;">
        <a href="http://51.21.243.60/" class="btn">View Clinic Dashboard & Protocol</a>
      </div>

      <!-- Emergency Warning -->
      <div class="alert-notice">
        🚨 <strong>Emergency Advisory:</strong> If you experience severe pelvic pain, high fever, or abnormal bleeding post-procedure, do not wait for email replies. Contact our 24/7 Clinical Emergency Line immediately at <strong>+91 98421 00000</strong>.
      </div>
    </div>
    <div class="footer">
      This is an automated clinical notification from FertiFlow AI Clinical Intelligence, Tamil Nadu, India.<br>
      Confidentiality Note: This message contains protected clinical information.
    </div>
  </div>
</body>
</html>"""

    @classmethod
    def send_clinical_reminder(
        cls,
        to_email: str,
        patient_name: str,
        stage: str,
        due_date: str,
        tamil_message: str,
        english_message: str,
        priority_score: int = 90,
    ) -> Dict[str, Any]:
        """
        Sends rich HTML clinical reminder email via SMTP.
        Falls back to simulation if SMTP credentials are not configured.
        """
        settings = get_settings()

        html_content = cls.generate_reminder_html(
            patient_name=patient_name,
            stage=stage,
            due_date=due_date,
            tamil_message=tamil_message,
            english_message=english_message,
            priority_score=priority_score,
        )

        subject = f"🌸 FertiFlow AI Reminder: {patient_name} - {stage.replace('_', ' ').title()} Protocol"

        # If SMTP is configured, attempt live email dispatch
        if settings.SMTP_ENABLED and settings.SMTP_USER and settings.SMTP_PASSWORD:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
                msg["To"] = to_email

                # Plain text version as fallback
                text_content = f"Dear {patient_name},\n\n{english_message}\n\n{tamil_message}\n\nDue Date: {due_date}\n\nFertiFlow AI Clinic"
                msg.attach(MIMEText(text_content, "plain"))
                msg.attach(MIMEText(html_content, "html"))

                # Connect via SSL or TLS
                if settings.SMTP_PORT == 465:
                    with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                        server.sendmail(msg["From"], [to_email], msg.as_string())
                else:
                    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                        server.ehlo()
                        server.starttls()
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                        server.sendmail(msg["From"], [to_email], msg.as_string())

                logger.info(f"[EmailService] Real email successfully delivered to {to_email}")
                return {
                    "success": True,
                    "status": "DELIVERED",
                    "recipient": to_email,
                    "subject": subject,
                }
            except Exception as e:
                logger.error(f"[EmailService] SMTP send error ({e}). Returning fallback status.")
                return {
                    "success": False,
                    "status": "FAILED",
                    "error": str(e),
                    "recipient": to_email,
                }

        # Simulated mode if credentials not configured
        logger.info(f"[EmailService -> Preview] Simulated email to {to_email} (SMTP credentials not yet provided in .env)")
        return {
            "success": True,
            "status": "SIMULATED",
            "recipient": to_email,
            "subject": subject,
            "note": "Configure SMTP_USER and SMTP_PASSWORD in backend/.env for live inbox delivery.",
        }
