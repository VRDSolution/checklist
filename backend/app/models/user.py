"""
User model for authentication and user management
"""
from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    """User roles in the system."""
    ADMIN = "admin"
    TECNICO = "tecnico"
    SUPERVISOR = "supervisor"


class User(Base):
    """User model representing system users."""
    
    __tablename__ = "usuarios"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic user information
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)  # bcrypt hash
    
    # User role and status
    role = Column(Enum(UserRole), default=UserRole.TECNICO, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))  # For soft delete
    
    # Relationships
    projetos = relationship("Project", back_populates="responsavel")
    checkins = relationship("Checkin", back_populates="usuario")
    audit_logs = relationship("AuditLog", back_populates="usuario")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
    
    @property
    def is_admin(self) -> bool:
        """Check if user is admin."""
        return self.role == UserRole.ADMIN
    
    @property
    def is_supervisor(self) -> bool:
        """Check if user is supervisor."""
        return self.role == UserRole.SUPERVISOR
    
    @property
    def is_tecnico(self) -> bool:
        """Check if user is tecnico."""
        return self.role == UserRole.TECNICO
    
    @property
    def can_manage_users(self) -> bool:
        """Check if user can manage other users."""
        return self.role == UserRole.ADMIN
    
    @property
    def can_view_all_projects(self) -> bool:
        """Check if user can view all projects."""
        return self.role in [UserRole.ADMIN, UserRole.SUPERVISOR]