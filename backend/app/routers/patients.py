from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import uuid

from app.db.database import get_db
from app.models.patient import Patient
from app.models.audit import AuditLog
from app.schemas.patient import PatientCreate, PatientUpdate, PatientRead

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.post("/", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db)):
    """Create a new patient record with duplicate phone validation."""
    existing = db.query(Patient).filter(Patient.phone == payload.phone).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Patient with phone number '{payload.phone}' already exists."
        )

    patient = Patient(
        id=str(uuid.uuid4()),
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        language=payload.language,
        district=payload.district,
        privacy_mode=payload.privacy_mode,
        consent_status=payload.consent_status,
    )
    db.add(patient)

    # Record Audit Log
    audit = AuditLog(
        action="CREATE",
        table_name="patients",
        record_id=patient.id,
        changed_by="coordinator_api",
        changes=payload.model_dump(),
    )
    db.add(audit)

    db.commit()
    db.refresh(patient)
    return patient


@router.get("/", response_model=List[PatientRead])
def list_patients(
    search: Optional[str] = Query(None, description="Search by name, phone or district"),
    language: Optional[str] = Query(None, description="Filter by language (ta/en)"),
    district: Optional[str] = Query(None, description="Filter by district"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List patients with optional search and filtering."""
    query = db.query(Patient)

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                Patient.name.ilike(search_fmt),
                Patient.phone.ilike(search_fmt),
                Patient.district.ilike(search_fmt),
            )
        )

    if language:
        query = query.filter(Patient.language == language)

    if district:
        query = query.filter(Patient.district.ilike(f"%{district}%"))

    patients = query.order_by(Patient.created_at.desc()).offset(skip).limit(limit).all()
    return patients


@router.get("/{id}", response_model=PatientRead)
def get_patient(id: str, db: Session = Depends(get_db)):
    """Get full patient profile with associated cycles and follow-up timeline."""
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{id}' not found."
        )
    return patient


@router.patch("/{id}", response_model=PatientRead)
def update_patient(id: str, payload: PatientUpdate, db: Session = Depends(get_db)):
    """Update patient information and track modifications in audit log."""
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{id}' not found."
        )

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        return patient

    # Check phone uniqueness if phone is being changed
    if "phone" in update_data and update_data["phone"] != patient.phone:
        existing = db.query(Patient).filter(Patient.phone == update_data["phone"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Phone number '{update_data['phone']}' is already assigned to another patient."
            )

    for field, val in update_data.items():
        setattr(patient, field, val)

    audit = AuditLog(
        action="UPDATE",
        table_name="patients",
        record_id=patient.id,
        changed_by="coordinator_api",
        changes=update_data,
    )
    db.add(audit)

    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(id: str, db: Session = Depends(get_db)):
    """Delete a patient record."""
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{id}' not found."
        )

    audit = AuditLog(
        action="DELETE",
        table_name="patients",
        record_id=patient.id,
        changed_by="coordinator_api",
        changes={"deleted_name": patient.name, "phone": patient.phone},
    )
    db.add(audit)
    db.delete(patient)
    db.commit()
    return None
