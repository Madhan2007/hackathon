from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.models.audit import AuditLog


class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        action: str,
        table_name: str,
        record_id: str,
        changed_by: str = "system",
        changes: Optional[Dict[str, Any]] = None,
        previous_value: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """
        Records an immutable audit entry in PostgreSQL / Supabase.
        """
        payload = changes or {}
        if previous_value:
            payload["_previous"] = previous_value

        audit = AuditLog(
            id=str(uuid.uuid4()),
            action=action,
            table_name=table_name,
            record_id=str(record_id),
            changed_by=changed_by,
            changes=payload,
            created_at=datetime.utcnow(),
        )
        db.add(audit)
        return audit
