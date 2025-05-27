import os
import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from models import User
from database import get_db

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security scheme
security = HTTPBearer(auto_error=False)

class AuthManager:
    def __init__(self):
        self.pwd_context = pwd_context
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password."""
        return self.pwd_context.hash(password)
    
    def create_access_token(self, user_id: int) -> str:
        """Create a JWT access token."""
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
        to_encode = {
            "sub": str(user_id),
            "exp": expire,
            "iat": datetime.utcnow()
        }
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[int]:
        """Verify a JWT token and return user ID."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id is None:
                return None
            return int(user_id)
        except jwt.PyJWTError:
            return None
    
    def create_user(self, db: Session, name: str, email: str, password: str) -> User:
        """Create a new user."""
        # Check if user exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise ValueError("Email already registered")
        
        # Validate input
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters long")
        
        if not email or "@" not in email:
            raise ValueError("Invalid email address")
        
        if not name or len(name.strip()) < 2:
            raise ValueError("Name must be at least 2 characters long")
        
        # Create user
        hashed_password = self.get_password_hash(password)
        user = User(
            name=name.strip(),
            email=email.lower().strip(),
            password_hash=hashed_password,
            subscription_status="free"
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return user
    
    def authenticate_user(self, db: Session, email: str, password: str) -> User:
        """Authenticate a user with email and password."""
        user = db.query(User).filter(User.email == email.lower().strip()).first()
        if not user:
            raise ValueError("Invalid email or password")
        
        if not self.verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password")
        
        return user
    
    def get_user_by_id(self, db: Session, user_id: int) -> Optional[User]:
        """Get user by ID."""
        return db.query(User).filter(User.id == user_id).first()

# Dependency to get current user from request
def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Get current authenticated user from request."""
    auth_manager = AuthManager()
    
    # Try to get token from cookie first
    token = request.cookies.get("access_token")
    
    # If no cookie, try Authorization header
    if not token:
        authorization: str = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            token = authorization[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = auth_manager.verify_token(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = auth_manager.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# Optional dependency for routes that can work with or without authentication
def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Get current user if authenticated, otherwise return None."""
    try:
        return get_current_user(request, db)
    except HTTPException:
        return None
