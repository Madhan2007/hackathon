import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON
from app.db.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, DELETE, ESCALATION, NOTIFICATION_SENT
    table_name = Column(String(100), nullable=False)  # patients, cycles, followups
    record_id = Column(String(100), nullable=False, index=True)
    changed_by = Column(String(100), nullable=False, default="system")
    changes = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action} table={self.table_name} record_id={self.record_id}>"
