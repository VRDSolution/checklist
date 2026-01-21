"""
Application Configuration Settings
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, Optional
import secrets


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    db_host: str
    db_user: str
    db_password: str
    db_name: str
    db_port: int = 3306
    
    @property
    def database_url(self) -> str:
        return f"mysql+pymysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    test_database_url: str = "sqlite:///./test_checklist.db"
    
    # Redis Cache Configuration
    # Format: redis://[user:password@]host:port/database
    # Example: redis://localhost:6379/0 (default local Redis)
    # Production: redis://:password@redis-server:6379/0
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        env="REDIS_URL",
        description="Redis connection URL for caching"
    )
    REDIS_CACHE_ENABLED: bool = Field(
        default=False,
        env="REDIS_CACHE_ENABLED",
        description="Enable/disable Redis caching (disable for local dev without Redis)"
    )
    REDIS_DEFAULT_TTL: int = Field(
        default=60,
        env="REDIS_DEFAULT_TTL",
        description="Default cache TTL in seconds"
    )
    
    # Security
    # CRITICAL: Secret key MUST be set via environment variable
    # Generate with: openssl rand -base64 32
    # Never use default value in production - tokens will be invalidated on restart
    secret_key: str = Field(..., description="JWT signing key - REQUIRED")
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    algorithm: str = "HS256"
    
    # CORS - Allow frontend origins
    allowed_origins: List[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"]
    
    # File Upload
    upload_dir: str = "./uploads"
    max_file_size: int = 10485760  # 10MB
    allowed_file_types: List[str] = [".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx", ".xls", ".xlsx"]
    
    # Pagination
    default_page_size: int = 20
    max_page_size: int = 100
    
    # Celery
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"
    
    # Environment
    environment: str = "development"
    debug: bool = True
    
    # Email (for future use)
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    
    # API Configuration
    api_v1_prefix: str = "/api/v1"
    project_name: str = "Check-in System API"
    version: str = "1.0.0"
    description: str = "Sistema de Check-in/Check-out para Técnicos - API"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


# Global settings instance
settings = Settings()