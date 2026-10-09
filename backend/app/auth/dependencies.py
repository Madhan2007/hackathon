from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User, UserRole
from app.auth.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Validates JWT token and loads user model from database."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    email = payload.get("email")

    user = None
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
    if not user and email:
        user = db.query(User).filter(User.email == email).first()

    # If Supabase Auth token provided and user not yet in local table, sync automatically
    if not user and email:
        role_claim = payload.get("user_metadata", {}).get("role", "coordinator")
        full_name = payload.get("user_metadata", {}).get("full_name") or email.split("@")[0].capitalize()
        user = User(
            id=user_id or str(__import__("uuid").uuid4()),
            email=email,
            full_name=full_name,
            hashed_password="EXTERNAL_AUTH_SUPABASE",
            role=UserRole(role_claim) if role_claim in [r.value for r in UserRole] else UserRole.COORDINATOR,
            department="Reproductive Medicine",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    return user

def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Gracefully extracts user if token exists, else None."""
    if not token:
        return None
    try:
        return get_current_user(token=token, db=db)
    except HTTPException:
        return None

def require_roles(allowed_roles: List[UserRole]):
    """Role-Based Access Control (RBAC) Dependency Factory.
    Ensures the user holds at least one of the specified roles.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role if isinstance(current_user.role, UserRole) else UserRole(current_user.role)
        if user_role not in allowed_roles:
            role_names = [r.value for r in allowed_roles]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(role_names)}. Current role: '{user_role.value}'",
            )
        return current_user
    return role_checker
