"""
Project API Endpoints (Controller Layer)

Thin HTTP controllers that delegate to service layer.
Responsibilities: HTTP concerns only (request/response, status codes, auth).

Architecture Pattern: Controller (MVC/Clean Architecture)
- Parse HTTP requests → DTOs
- Call service layer (business logic lives there)
- Map domain entities → HTTP responses
- Handle HTTP-specific errors (4xx, 5xx)

Does NOT:
- Contain business logic (that's in ProjectService)
- Know about database (that's in repositories)
- Manipulate domain entities directly (use service methods)
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse

from app.api.deps import get_current_active_user
from app.models.user import User
from app.services.project_service import ProjectService
from app.services.dependencies import get_project_service
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectStatusTransitionRequest,
    ProjectResponse,
    ProjectStatisticsResponse,
    ContributorAddRequest
)
from app.schemas.user import UserResponse
from app.domain.entities.project import (
    ProjectStatus,
    BusinessRuleViolationError,
    InvalidStateTransitionError
)
from app.domain.repositories.project_repository import ProjectNotFoundError
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


# ========================================
# CRUD Endpoints
# ========================================

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    *,
    request: ProjectCreateRequest,
    service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(get_current_active_user)
) -> ProjectResponse:
    """
    Create a new project.
    
    Business Rules:
    - End date must be after start date
    - Name is required and non-empty
    - Client and responsible user must exist
    
    Returns:
        201: Project created successfully
        400: Business rule violation
        401: Unauthorized
    """
    try:
        # Service layer handles business logic
        project = await service.create_project(
            name=request.name,
            description=request.description,
            start_date=request.start_date,
            end_date_planned=request.end_date_planned,
            client_id=request.client_id,
            responsible_user_id=request.responsible_user_id,
            estimated_value=request.estimated_value
        )
        
        # Map domain entity to DTO
        return ProjectResponse.from_domain(project)
        
    except BusinessRuleViolationError as e:
        logger.warning("project_creation_failed", reason=str(e), user_id=current_user.id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    *,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records"),
    status_filter: ProjectStatus = Query(None, description="Filter by project status"),
    client_id: int = Query(None, gt=0, description="Filter by client ID"),
    service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(get_current_active_user)
) -> List[ProjectResponse]:
    """
    List projects with optional filtering and pagination.
    
    Query Parameters:
    - skip: Pagination offset (default: 0)
    - limit: Max results per page (default: 100, max: 100)
    - status_filter: Filter by project status
    - client_id: Filter by client
    
    Returns:
        200: List of projects
        401: Unauthorized
    """
    # Determine responsible_id filter based on user role
    responsible_id = None
    if current_user.role == "tecnico":
        responsible_id = current_user.id

    projects = service.list_projects(
        skip=skip,
        limit=limit,
        status=status_filter,
        client_id=client_id,
        responsible_id=responsible_id
    )
    
    return [ProjectResponse.from_domain(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    *,
    project_id: int,
    service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(get_current_active_user)
) -> ProjectResponse:
    """
    Get project by ID.
    
    Returns:
        200: Project details
        404: Project not found
        401: Unauthorized
    """
    try:
        project = await service.get_project(project_id)
        return ProjectResponse.from_domain(project)
        
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    *,
    project_id: int,
    request: ProjectUpdateRequest,
    service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(get_current_active_user)
) -> ProjectResponse:
    """
    Update project details.
    
    Business Rule: Cannot update completed/cancelled projects.
    
    Returns:
        200: Project updated successfully
        400: Business rule violation
        404: Project not found
        401: Unauthorized
    """
    try:
        project = await service.update_project(
            project_id=project_id,
            name=request.name,
            description=request.description,
            end_date_planned=request.end_date_planned,
            observations=request.observations,
            estimated_value=request.estimated_value
        )
        
        return ProjectResponse.from_domain(project)
        
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except BusinessRuleViolationError as e:
        logger.warning("project_update_failed", project_id=project_id, reason=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    *,
    project_id: int,
    force: bool = Query(False, description="Force hard delete from database"),
    service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(get_current_active_user)
) -> None:
    """
    Delete project with authorization check.
    
    Security: OWASP A01:2021 - Broken Access Control
    - Admin can delete any project
    - Supervisor can delete projects they are responsible for
    - Regular users cannot delete projects
    
    Returns:
        204: Project deleted successfully
        403: Forbidden (not authorized to delete this project)
        404: Project not found
        401: Unauthorized
    """
    # Authorization logic
    # APENAS ADMINS podem excluir projetos agora
    if not current_user.is_admin:
        logger.warning(
            "unauthorized_delete_attempt",
            user_id=current_user.id,
            user_role=current_user.role,
            project_id=project_id
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem excluir projetos"
        )
    
    try:
        deleted = await service.delete_project(project_id=project_id, force=force)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID {project_id} not found"
            )

        logger.info(
            "project_deleted",
            project_id=project_id,
            deleted_by=current_user.id,
            force=force
        )
    except RepositoryError as e:
        logger.error(
            "project_delete_failed_endpoint",
            project_id=project_id,
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir projeto: {str(e)}"
        )


# ========================================
# Business Operation Endpoints
# ========================================

@router.post("/{project_id}/start", response_model=ProjectResponse)
async def start_project(
    *,
    project_id: int,
    service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(get_current_active_user)
) -> ProjectResponse:
    """
    Start a project (transition to EM_ANDAMENTO).
    
    Business Rule: Can only start from PLANEJAMENTO or PAUSADO.
    
    Returns:
        200: Project started successfully
        400: Invalid state transition
        404: Project not found
    """
    try:
        # Permission check
        project = await service.get_project(project_id)
        if not (current_user.is_admin or current_user.is_supervisor) and project.responsible_user_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not authorized to update project status")

        project = await service.start_project(project_id)
        return ProjectResponse.from_domain(project)
        
    except ProjectNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidStateTransitionError as e:
        logger.warning("project_start_failed", project_id=project_id, reason=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{project_id}/pause", response_model=ProjectResponse)
async def pause_project(
    *,
    project_id: int,
    service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(get_current_active_user)
) -> ProjectResponse:
    """
    Pause an active project.
    
    Business Rule: Can only pause EM_ANDAMENTO projects.
    """
    try:
        # Permission check
        project = await service.get_project(project_id)
        if not (current_user.is_admin or current_user.is_supervisor) and project.responsible_user_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not authorized to update project status")

        project = await service.pause_project(project_id)
        return ProjectResponse.from_domain(project)
        
    except ProjectNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{project_id}/complete", response_model=ProjectResponse)
async def complete_project(
    *,
    project_id: int,
    request: ProjectStatusTransitionRequest = None,
    service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(get_current_active_user)
) -> ProjectResponse:
    """
    Mark project as completed.
    
    Business Rule: Can only complete active projects.
    """
    try:
        # Permission check
        project = await service.get_project(project_id)
        if not (current_user.is_admin or current_user.is_supervisor) and project.responsible_user_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not authorized to update project status")

        completion_date = request.completion_date if request else None
        project = await service.complete_project(project_id, completion_date)
        return ProjectResponse.from_domain(project)
        
    except ProjectNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{project_id}/cancel", response_model=ProjectResponse)
async def cancel_project(
    *,
    project_id: int,
    request: ProjectStatusTransitionRequest = None,
    service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(get_current_active_user)
) -> ProjectResponse:
    """
    Cancel project.
    
    Business Rule: Cannot cancel completed projects.
    """
    try:
        # Permission check
        project = await service.get_project(project_id)
        if not (current_user.is_admin or current_user.is_supervisor) and project.responsible_user_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not authorized to update project status")

        reason = request.cancellation_reason if request else None
        project = await service.cancel_project(project_id, reason)
        return ProjectResponse.from_domain(project)
        
    except ProjectNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ========================================
# Query/Analytics Endpoints
# ========================================

@router.get("/analytics/statistics", response_model=ProjectStatisticsResponse)
async def get_project_statistics(
    *,
    service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(get_current_active_user)
) -> ProjectStatisticsResponse:
    """
    Get project statistics across all statuses.
    
    Use Case: Dashboard widgets, executive reports
    
    Returns:
        200: Statistics dictionary
    """
    stats = service.get_project_statistics()
    return ProjectStatisticsResponse(**stats)


@router.get("/analytics/overdue", response_model=List[ProjectResponse])
async def get_overdue_projects(
    *,
    service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(get_current_active_user)
) -> List[ProjectResponse]:
    """
    Get projects that are past their deadline.
    
    Use Case: Alert dashboard, manager notifications
    """
    projects = service.get_overdue_projects()
    return [ProjectResponse.from_domain(p) for p in projects]


# ========================================
# Contributor Endpoints
# ========================================

@router.post("/{project_id}/contributors", status_code=status.HTTP_201_CREATED)
async def add_contributor(
    project_id: int,
    request: ContributorAddRequest,
    service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Add a contributor to a project.
    
    Permissions:
    - Admin: Can add to any project
    - Responsible: Can add to their own projects
    """
    # Check permissions
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if not (current_user.is_admin or current_user.is_supervisor) and project.responsible_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to manage contributors for this project")
        
    try:
        service.add_contributor(project_id, request.user_id)
        return {"message": "Contributor added successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{project_id}/contributors/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_contributor(
    project_id: int,
    user_id: int,
    service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Remove a contributor from a project.
    
    Permissions:
    - Admin: Can remove from any project
    - Responsible: Can remove from their own projects
    """
    # Check permissions
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if not (current_user.is_admin or current_user.is_supervisor) and project.responsible_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to manage contributors for this project")
        
    try:
        service.remove_contributor(project_id, user_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{project_id}/contributors", response_model=List[UserResponse])
async def get_contributors(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all contributors for a project.
    """
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    contributors = service.get_contributors(project_id)
    return [UserResponse.model_validate(u) for u in contributors]
