from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = Field(
        default="sqlite:///./fertiflow.db",
        description="Database connection URL (PostgreSQL / Supabase / SQLite fallback)"
    )
    GEMINI_API_KEY: str = Field(
        default="",
        description="Google Gemini API key for AI orchestration & patient communication"
    )
    SECRET_KEY: str = Field(
        default="fertiflow-dev-secret-key-32-chars-long",
        description="JWT and encryption secret key"
    )
    ENVIRONMENT: str = Field(default="development", description="Runtime environment")
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    # n8n Workflow Automation Settings
    N8N_ENABLED: bool = Field(
        default=False,
        description="Enable n8n workflow integration for outbound communications and doctor alerts"
    )
    N8N_OUTBOUND_WEBHOOK_URL: str = Field(
        default="http://localhost:5678/webhook/fertiflow-outbound",
        description="n8n webhook URL for outbound WhatsApp/SMS dispatches"
    )
    N8N_DOCTOR_ALERT_WEBHOOK_URL: str = Field(
        default="http://localhost:5678/webhook/fertiflow-doctor-alert",
        description="n8n webhook URL for urgent medical escalation alerts"
    )
    N8N_WEBHOOK_TIMEOUT: float = Field(
        default=4.0,
        description="Timeout in seconds when firing webhooks to n8n"
    )

    # Twilio WhatsApp Integration Settings
    TWILIO_ACCOUNT_SID: str = Field(
        default="",
        description="Twilio Account SID (e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)"
    )
    TWILIO_AUTH_TOKEN: str = Field(
        default="",
        description="Twilio Auth Token"
    )
    TWILIO_WHATSAPP_FROM: str = Field(
        default="whatsapp:+14155238886",
        description="Twilio WhatsApp sender (default is Twilio Sandbox: whatsapp:+14155238886)"
    )

    # Email SMTP Notification Settings (e.g. Gmail App Password, Brevo, AWS SES)
    SMTP_ENABLED: bool = Field(default=True, description="Enable email reminder dispatches")
    SMTP_HOST: str = Field(default="smtp.gmail.com", description="SMTP host server")
    SMTP_PORT: int = Field(default=587, description="SMTP port (587 for TLS, 465 for SSL)")
    SMTP_USER: str = Field(default="", description="SMTP account username / email")
    SMTP_PASSWORD: str = Field(default="", description="SMTP password or Gmail App Password")
    SMTP_FROM_EMAIL: str = Field(default="FertiFlow AI <noreply@fertiflow.ai>", description="Outgoing from address")

    # Exotel Indian Telephony Settings (Calls Indian Mobile Numbers directly)
    EXOTEL_ACCOUNT_SID: str = Field(default="", description="Exotel Account SID")
    EXOTEL_API_KEY: str = Field(default="", description="Exotel API Key")
    EXOTEL_API_TOKEN: str = Field(default="", description="Exotel API Token")
    EXOTEL_CALLER_ID: str = Field(default="", description="Exotel Virtual Number (e.g. 080471... or 044...)")

    # n8n Voice Call Trigger Webhook
    N8N_VOICE_CALL_WEBHOOK_URL: str = Field(
        default="http://n8n:5678/webhook/fertiflow-voice-call",
        description="n8n webhook URL for automated voice call trigger"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def normalized_database_url(self) -> str:
        """Normalize database URL and resolve relative sqlite paths consistently."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and "+psycopg2" not in url and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        elif url.startswith("sqlite:///./") or url.startswith("sqlite:////"):
            # Resolve relative sqlite database file relative to backend root
            import os
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
            db_name = url.replace("sqlite:///./", "").replace("sqlite:///", "")
            full_path = os.path.join(base_dir, db_name)
            # Use forward slashes for SQLite URI format
            url = f"sqlite:///{full_path.replace(os.sep, '/')}"
        return url


@lru_cache()
def get_settings() -> Settings:
    return Settings()
