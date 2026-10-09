from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

UserRoleLiteral = Literal["admin", "doctor", "coordinator", "nurse"]

class UserCreate(BaseModel):
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", description="Valid email address")
    password: str = Field(..., min_length=6, description="Minimum 6 characters")
    full_name: str = Field(..., min_length=2, max_length=255)
    role: UserRoleLiteral = "coordinator"
    department: Optional[str] = "Reproductive Medicine"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserRoleUpdate(BaseModel):
    role: UserRoleLiteral
    department: Optional[str] = None
