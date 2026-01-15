"""Project DTOs/Schemas

Data Transfer Objects for API input/output.
These schemas define the contract between API and clients.

Architecture Note:
- Independent from domain entities (app.domain.entities.project)
- Independent from ORM models (app.models.project)
- Focused on API concerns: validation, serialization, documentation
"""
from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator

# Import domain enum for consistency
from app.domain.entities.project import ProjectStatus
from app.schemas.client import ClientResponse
from app.schemas.user import UserResponse


class ContributorAddRequest(BaseModel):
    """Request DTO for adding a contributor."""
    user_id: int = Field(..., gt=0, description="User ID to add as contributor")


class ProjectCreateRequest(BaseModel):
    """
    Request DTO for creating a new project.
    
    Validation:
    - Name: Required, non-empty, max 200 chars
    - Dates: end_date_planned must be after start_date (validated in service)
    - Client ID: Required positive integer
    """
    name: str = Field(..., min_length=1, max_length=200, description="Project name")
    description: Optional[str] = Field(default=None, max_length=5000, description="Project description")
    start_date: date = Field(..., description="Project start date")
    end_date_planned: Optional[date] = Field(default=None, description="Planned completion date")
    client_id: int = Field(..., gt=0, description="Client ID who owns this project")
    responsible_user_id: int = Field(..., gt=0, description="User responsible for this project")
    estimated_value: Optional[str] = Field(default=None, max_length=20, description="Estimated project value")
    observations: Optional[str] = Field(default=None, max_length=5000, description="Additional notes")
    
    @field_validator('name')
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        """Ensure name is not just whitespace."""
        if not v.strip():
            raise ValueError('Project name cannot be empty or whitespace')
        return v.strip()
    
    @field_validator('start_date', mode='before')
    @classmethod
    def parse_start_date(cls, v):
        """Parse date from string if needed."""
        if isinstance(v, str):
            if not v or v.strip() == '':
                from datetime import date as date_class
                return date_class.today()
            return date.fromisoformat(v)
        return v
    
    @field_validator('end_date_planned', mode='before')
    @classmethod
    def parse_end_date(cls, v):
        """Parse optional date from string if needed."""
        if v is None or (isinstance(v, str) and v.strip() == ''):
            return None
        if isinstance(v, str):
            return date.fromisoformat(v)
        return v


class ProjectUpdateRequest(BaseModel):
    """
    Request DTO for updating project details.
    
    All fields are optional - only provided fields will be updated.
    """
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    end_date_planned: Optional[date] = None
    estimated_value: Optional[str] = Field(None, max_length=20)
    observations: Optional[str] = Field(None, max_length=5000)
    status: Optional[ProjectStatus] = Field(None, description="Force status change (bypasses transition rules)")
    
    @field_validator('name')
    @classmethod
    def name_must_not_be_empty(cls, v: Optional[str]) -> Optional[str]:
        """Ensure name is not just whitespace if provided."""
        if v is not None and not v.strip():
            raise ValueError('Project name cannot be empty or whitespace')
        return v.strip() if v else None


class ProjectStatusTransitionRequest(BaseModel):
    """Request DTO for project status transitions (start, pause, complete, cancel)."""
    completion_date: Optional[date] = Field(None, description="Actual completion date (for complete action)")
    cancellation_reason: Optional[str] = Field(None, max_length=500, description="Reason for cancellation")


class ProjectResponse(BaseModel):
    """
    Response DTO for project data.
    
    Includes all project details for client consumption.
    """
    id: int
    name: str = Field(..., validation_alias="nome")
    description: Optional[str] = Field(None, validation_alias="descricao")
    start_date: date = Field(..., validation_alias="data_inicio")
    end_date_planned: Optional[date] = Field(None, validation_alias="data_fim_prevista")
    end_date_actual: Optional[date] = Field(None, validation_alias="data_fim_real")
    status: ProjectStatus
    client_id: int = Field(..., validation_alias="cliente_id")
    responsible_user_id: int = Field(..., validation_alias="responsavel_id")
    estimated_value: Optional[str] = Field(None, validation_alias="valor_estimado")
    observations: Optional[str] = Field(None, validation_alias="observacoes")

    # Nested relations
    client: Optional[ClientResponse] = Field(
        default=None,
        validation_alias="cliente",
        serialization_alias="client"
    )
    responsible_user: Optional[UserResponse] = Field(
        default=None,
        validation_alias="responsavel",
        serialization_alias="responsible_user"
    )
    contributors: Optional[List[UserResponse]] = Field(
        default=None,
        description="List of project contributors"
    )
    
    # Computed fields
    is_active: bool = Field(description="True if project is currently active")
    is_overdue: bool = Field(description="True if past planned end date")
    duration_days: Optional[int] = Field(None, description="Actual duration in days (if completed)")
    
    # Metadata
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {
        "from_attributes": True,
        "populate_by_name": True
    }
    
    @classmethod
    def from_domain(cls, project: 'Project') -> 'ProjectResponse':
        """
        Factory method to create DTO from domain entity.
        
        Args:
            project: Domain entity (app.domain.entities.project.Project)
            
        Returns:
            ProjectResponse DTO
        """
        from app.domain.entities.project import Project as DomainProject
        
        return cls(
            id=project.id,
            name=project.name,
            description=project.description,
            start_date=project.start_date,
            end_date_planned=project.end_date_planned,
            end_date_actual=project.end_date_actual,
            status=project.status,
            client_id=project.client_id,
            responsible_user_id=project.responsible_user_id,
            estimated_value=project.estimated_value,
            observations=project.observations,
            is_active=project.is_active,
            is_overdue=project.is_overdue,
            duration_days=project.duration_days,
            created_at=project.created_at,
            updated_at=project.updated_at,
            client=project.client,
            responsible_user=project.responsible_user,
            contributors=project.contributors
        )


class ProjectListResponse(BaseModel):
    """Response DTO for paginated project lists."""
    items: list[ProjectResponse]
    total: int = Field(description="Total number of projects (for pagination)")
    skip: int = Field(description="Number of skipped items")
    limit: int = Field(description="Maximum items per page")


class ProjectStatisticsResponse(BaseModel):
    """Response DTO for project statistics/analytics."""
    planejamento: int = Field(description="Projects in planning")
    em_andamento: int = Field(description="Active projects")
    pausado: int = Field(description="Paused projects")
    concluido: int = Field(description="Completed projects")
    cancelado: int = Field(description="Cancelled projects")
    total_active: int = Field(description="Total currently active")
    total_overdue: int = Field(description="Total overdue projects")

