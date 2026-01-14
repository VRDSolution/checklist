"""
Authentication endpoints
"""
from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import (
    create_access_token, 
    create_refresh_token,
    verify_password,
    hash_password,
    verify_token
)
from app.core.logging import get_logger
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    RegisterRequest,
    UserInfo
)
from app.schemas.user import UserResponse, UserPasswordUpdate
from app.schemas.common import MessageResponse
from app.core.exceptions import invalid_credentials

router = APIRouter()
security = HTTPBearer()
logger = get_logger(__name__)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Login endpoint - authenticate user and return JWT token.
    
    Security: Uses structured logging without exposing sensitive data.
    Rate Limit: 5 requests per minute.
    """
    logger.info("login_attempt", email=login_data.email)
    
    # Find user by email
    user = db.query(User).filter(
        User.email == login_data.email,
        User.is_active == True,
        User.deleted_at.is_(None)
    ).first()
    
    # Verify user exists and password is correct
    if not user:
        logger.warning("login_failed_user_not_found", email=login_data.email)
        raise invalid_credentials()
        
    if not verify_password(login_data.password, user.hashed_password):
        logger.warning("login_failed_invalid_password", email=login_data.email, user_id=user.id)
        raise invalid_credentials()
    
    # Create access and refresh tokens
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value},
        expires_delta=access_token_expires
    )
    
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    logger.info("login_success", user_id=user.id, email=user.email, role=user.role.value)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        refresh_token=refresh_token,
        user=UserInfo(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role
        )
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Refresh token endpoint - get new access token using refresh token.
    Rate Limit: 10 requests per minute.
    """
    try:
        payload = verify_token(refresh_data.refresh_token)
        
        # Check if it's a refresh token
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de refresh inválido"
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido"
            )
        
        # Find user
        user = db.query(User).filter(
            User.id == int(user_id),
            User.is_active == True,
            User.deleted_at.is_(None)
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuário não encontrado"
            )
        
        # Create new access token
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email, "role": user.role.value},
            expires_delta=access_token_expires
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
            user=UserInfo(
                id=user.id,
                name=user.name,
                email=user.email,
                role=user.role
            )
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de refresh inválido"
        )


@router.post("/register", response_model=UserResponse)
async def register(
    register_data: RegisterRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Register new user (public endpoint - modify as needed).
    """
    # Check if user with email already exists
    existing_user = db.query(User).filter(User.email == register_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado no sistema"
        )
    
    # Create new user
    user = User(
        name=register_data.name,
        email=register_data.email,
        hashed_password=hash_password(register_data.password)
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get current user information.
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserPasswordUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Update current user profile.
    """
    # For now, just implement password update
    # You can extend this to update other profile fields
    
    # Verify current password
    if not verify_password(user_update.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta"
        )
    
    # Update password
    current_user.hashed_password = hash_password(user_update.new_password)
    db.commit()
    db.refresh(current_user)
    
    return current_user


@router.post("/logout", response_model=MessageResponse)
async def logout(
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Logout endpoint (token blacklist can be implemented here if needed).
    """
    # In a real implementation, you might want to blacklist the token
    # For now, we'll just return a success message
    return MessageResponse(message="Logout realizado com sucesso")