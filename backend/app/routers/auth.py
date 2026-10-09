from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.db.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    UserRoleUpdate,
)
from app.auth.security import (
    verify_password,
    get_password_hash,
    create_access_token,
)
from app.auth.dependencies import (
    get_current_user,
    require_roles,
)

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

DEMO_USERS_CONFIG = [
    {
        "email": "admin@fertiflow.ai",
        "full_name": "Dr. Subha Ramanathan (Admin)",
        "password": "Password@123",
        "role": UserRole.ADMIN,
        "department": "Executive Clinic Directorate",
    },
    {
        "email": "dr.subha@fertiflow.ai",
        "full_name": "Dr. Subha Lakshmi MBBS, MS (OBG), DRM",
        "password": "Password@123",
        "role": UserRole.DOCTOR,
        "department": "Reproductive Medicine & Surgery",
    },
    {
        "email": "coordinator@fertiflow.ai",
        "full_name": "Priya Sundaram",
        "password": "Password@123",
        "role": UserRole.COORDINATOR,
        "department": "Patient Coordination Hub",
    },
    {
        "email": "nurse@fertiflow.ai",
        "full_name": "Kavitha Rajan (Staff Nurse)",
        "password": "Password@123",
        "role": UserRole.NURSE,
        "department": "OPD & Stimulation Ward",
    },
]

def ensure_demo_users(db: Session):
    """Utility to seed demo accounts if not present."""
    for demo in DEMO_USERS_CONFIG:
        existing = db.query(User).filter(User.email == demo["email"]).first()
        if not existing:
            new_user = User(
                id=str(uuid.uuid4()),
                email=demo["email"],
                full_name=demo["full_name"],
                hashed_password=get_password_hash(demo["password"]),
                role=demo["role"],
                department=demo["department"],
                is_active=True,
            )
            db.add(new_user)
    db.commit()

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(data: UserCreate, db: Session = Depends(get_db)):
    """Register a new clinic staff member with role selection."""
    existing_user = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    try:
        user_role = UserRole(data.role.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {[r.value for r in UserRole]}",
        )

    new_user = User(
        id=str(uuid.uuid4()),
        email=data.email.lower().strip(),
        full_name=data.full_name.strip(),
        hashed_password=get_password_hash(data.password),
        role=user_role,
        department=data.department or "Reproductive Medicine",
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token_payload = {
        "sub": new_user.id,
        "email": new_user.email,
        "role": new_user.role.value,
        "full_name": new_user.full_name,
        "department": new_user.department,
    }
    access_token = create_access_token(data=token_payload)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user.to_dict()),
    )

@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate email & password and return a signed JWT token."""
    # Ensure demo accounts exist on first login attempt
    ensure_demo_users(db)

    user = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated. Please contact administrator.",
        )

    token_payload = {
        "sub": user.id,
        "email": user.email,
        "role": user.role.value if isinstance(user.role, UserRole) else str(user.role),
        "full_name": user.full_name,
        "department": user.department,
    }
    access_token = create_access_token(data=token_payload)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user.to_dict()),
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve current logged in user details and role permissions."""
    return UserResponse.model_validate(current_user.to_dict())

@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all registered users (available for clinic staff management)."""
    ensure_demo_users(db)
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [UserResponse.model_validate(u.to_dict()) for u in users]

@router.patch("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: str,
    update_data: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """Admin-only endpoint to elevate or modify user roles."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    try:
        user.role = UserRole(update_data.role.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role value",
        )

    if update_data.department:
        user.department = update_data.department

    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user.to_dict())

@router.post("/seed-demo-users")
def seed_demo_users_endpoint(db: Session = Depends(get_db)):
    """Explicitly initializes or resets demo users."""
    ensure_demo_users(db)
    users = db.query(User).all()
    return {
        "status": "success",
        "message": "Demo users seeded successfully",
        "users_count": len(users),
        "demo_accounts": [
            {"email": d["email"], "role": d["role"].value, "default_password": d["password"]}
            for d in DEMO_USERS_CONFIG
        ]
    }
