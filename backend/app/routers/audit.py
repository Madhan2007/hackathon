from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.audit import AuditLog

router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get("/")
def list_audit_logs(
    record_id: Optional[str] = Query(None),
    table_name: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Query immutable audit logs for compliance, state transitions, and staff actions."""
    query = db.query(AuditLog)
    if record_id:
        query = query.filter(AuditLog.record_id == record_id)
    if table_name:
        query = query.filter(AuditLog.table_name == table_name)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "action": log.action,
            "table_name": log.table_name,
            "record_id": log.record_id,
            "changed_by": log.changed_by,
            "changes": log.changes,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
