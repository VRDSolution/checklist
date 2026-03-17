"""
User schemas for API serialization
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
import re
from app.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema with common fields."""
    name: str = Field(..., min_length=2, max_length=100, description="User full name")
    email: EmailStr = Field(..., description="User email address")
    role: UserRole = Field(UserRole.TECNICO, description="User role")


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8, max_length=50, description="User password")

    @field_validator('password')
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if not re.search(r"\d", v):
            raise ValueError("A senha deve conter pelo menos um número")
        if not re.search(r"[A-Z]", v):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("A senha deve conter pelo menos um caractere especial")
        return v


class UserUpdate(BaseModel):
    """Schema for updating user information."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserPasswordUpdate(BaseModel):
    """Schema for updating user password."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=50, description="New password")

    @field_validator('new_password')
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if not re.search(r"\d", v):
            raise ValueError("A senha deve conter pelo menos um número")
        if not re.search(r"[A-Z]", v):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("A senha deve conter pelo menos um caractere especial")
        return v


class UserAdminPasswordUpdate(BaseModel):
    """Schema for admin updating another user's password."""
    new_password: str = Field(..., min_length=8, max_length=50, description="New password")

    @field_validator('new_password')
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if not re.search(r"\d", v):
            raise ValueError("A senha deve conter pelo menos um número")
        if not re.search(r"[A-Z]", v):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("A senha deve conter pelo menos um caractere especial")
        return v


class UserResponse(UserBase):
    """Schema for user response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    @property
    def can_manage_users(self) -> bool:
        """Check if user can manage other users."""
        return self.role == UserRole.ADMIN

    @property
    def can_view_all_projects(self) -> bool:
        """Check if user can view all projects."""
        return self.role in [UserRole.ADMIN, UserRole.SUPERVISOR]


class UserListResponse(BaseModel):
    """Schema for user list response with pagination."""
    users: List[UserResponse]
    total: int
    page: int
    size: int


class UserStatsResponse(BaseModel):
    """Schema for user statistics."""
    total_checkins: int
    total_horas_trabalhadas: int
    projetos_ativos: int
    ultimo_checkin: Optional[datetime] = None