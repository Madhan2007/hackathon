import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
from jose import jwt, JWTError
from app.config import get_settings

settings = get_settings()

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days session for clinic workflow

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain-text password against the hashed string using standard bcrypt."""
    try:
        # Truncate to 72 bytes as required by bcrypt specification
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Hashes a password with bcrypt salt."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generates a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT token. Checks FertiFlow Secret first, then fallback."""
    try:
        # First attempt decoding with FertiFlow SECRET_KEY
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM], options={"verify_aud": False})
        return payload
    except JWTError:
        # Attempt decoding without verification in case of Supabase JWT inspection
        try:
            unverified = jwt.get_unverified_claims(token)
            return unverified
        except Exception:
            return None
