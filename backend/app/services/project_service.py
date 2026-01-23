"""
Project Application Service

Orchestrates business operations for projects.
This is the Application Layer in Clean Architecture.

Responsibilities:
- Coordinate between domain entities and repositories
- Enforce business rules and validation
- Manage transactions (via Unit of Work pattern - future enhancement)
- Transform DTOs to domain entities and vice versa
- Cache management for high-performance reads

Does NOT:
- Know about HTTP/REST (that's the controller's job)
- Know about SQLAlchemy (that's the repository's job)
- Contain framework-specific code

Architecture Pattern: Application Service (DDD)
- Stateless (no instance variables except dependencies)
- Transaction boundary (each method is one transaction)
- Thin orchestration layer

Performance Optimizations:
- Cache-Aside pattern for read-heavy operations
- Automatic cache invalidation on mutations
"""
from typing import List, Optional, Any
from datetime import date

from app.domain.entities.project import (
    Project,
    ProjectStatus,
    BusinessRuleViolationError,
    InvalidStateTransitionError
)
from app.domain.repositories.project_repository import (
    IProjectRepository,
    ProjectNotFoundError
)
from app.core.logging import get_logger
from app.core.cache import (
    CacheService,
    invalidate_project_cache,
    invalidate_projects_list_cache
)

logger = get_logger(__name__)


class ProjectService:
    """
    Application service for project operations.
    
    Design Pattern: Facade + Coordinator + Cache-Aside
    - Provides high-level API for project operations
    - Coordinates between domain entities and repositories
    - Enforces business workflows
    - Manages cache lifecycle (read-through + write-through invalidation)
    """
    
    def __init__(self, project_repository: IProjectRepository):
        """
        Initialize service with dependencies.
        
        Args:
            project_repository: Repository abstraction (injected via DI)
        """
        self.repository = project_repository
        self.cache = CacheService(namespace="projects", default_ttl=300)  # 5min TTL
    
    # ========================================
    # CRUD Operations
    # ========================================
    
    async def create_project(
        self,
        name: str,
        client_id: int,
        responsible_user_id: int,
        start_date: date,
        description: Optional[str] = None,
        end_date_planned: Optional[date] = None,
        estimated_value: Optional[str] = None
    ) -> Project:
        """
        Create a new project.
        
        Business Rules Enforced:
        1. End date must be after start date (via domain entity)
        2. Name is required (non-empty)
        3. Client and responsible user must exist (validated elsewhere)
        
        Args:
            name: Project name (required)
            client_id: Client who owns this project
            responsible_user_id: User responsible for project
            start_date: Project start date
            description: Optional description
            end_date_planned: Planned completion date (optional)
            estimated_value: Estimated cost/value (optional)
            
        Returns:
            Created project with generated ID
            
        Raises:
            BusinessRuleViolationError: If business rules are violated
        """
        # Validation
        if not name or not name.strip():
            raise BusinessRuleViolationError("Project name cannot be empty")
        
        # Create domain entity (validation happens in __post_init__)
        project = Project(
            name=name.strip(),
            description=description,
            start_date=start_date,
            end_date_planned=end_date_planned,
            status=ProjectStatus.PLANEJAMENTO,
            client_id=client_id,
            responsible_user_id=responsible_user_id,
            estimated_value=estimated_value
        )
        
        # Persist via repository
        saved_project = self.repository.save(project)
        
        # Invalidate list caches (new project added)
        await invalidate_projects_list_cache()
        
        logger.info(
            "project_created_via_service",
            project_id=saved_project.id,
            name=saved_project.name,
            client_id=client_id
        )
        
        return saved_project
    
    async def get_project(self, project_id: int) -> Project:
        """
        Retrieve project by ID with caching.
        
        Cache Strategy:
        - Cache key: "project:{id}"
        - TTL: 5 minutes
        - Invalidated on: update, delete, status change
        
        Args:
            project_id: Unique identifier
            
        Returns:
            Project domain entity
            
        Raises:
            ProjectNotFoundError: If project doesn't exist
        """
        # Try cache first (Cache-Aside pattern)
        cache_key = f"project:{project_id}"
        cached = await self.cache.get(cache_key)
        
        if cached:
            logger.debug("project_cache_hit", project_id=project_id)
            # Deserialize from dict back to domain entity
            return Project(**cached)
        
        # Cache miss - fetch from DB
        logger.debug("project_cache_miss", project_id=project_id)
        project = self.repository.get_by_id(project_id)
        
        if not project:
            raise ProjectNotFoundError(project_id)
        
        # Store in cache (serialize domain entity to dict)
        await self.cache.set(cache_key, project.__dict__, ttl=300)
        
        return project
    
    def list_projects(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[ProjectStatus] = None,
        client_id: Optional[int] = None,
        responsible_id: Optional[int] = None
    ) -> List[Project]:
        """
        List projects with OFFSET pagination (legacy).
        
        Note: For better performance on large datasets, use list_projects_cursor().
        
        Args:
            skip: Pagination offset
            limit: Maximum results (capped at 100 for performance)
            status: Filter by status (optional)
            client_id: Filter by client (optional)
            responsible_id: Filter by responsible user (optional)
            
        Returns:
            List of projects
        """
        # Enforce maximum limit for performance
        limit = min(limit, 100)
        
        return self.repository.get_all(
            skip=skip, 
            limit=limit, 
            status=status, 
            client_id=client_id,
            responsible_id=responsible_id
        )

    def list_projects_cursor(
        self,
        cursor: Optional[int] = None,
        limit: int = 20,
        status: Optional[ProjectStatus] = None,
        client_id: Optional[int] = None
    ) -> tuple[List[Project], Optional[int]]:
        """
        List projects with CURSOR-BASED pagination (recommended for performance).
        
        Performance: 10-100x faster than offset on deep pages.
        
        Args:
            cursor: Last seen project ID (None for first page)
            limit: Page size (max 100)
            status: Filter by status
            client_id: Filter by client
            
        Returns:
            Tuple of (projects, next_cursor)
        
        Example:
            # First page
            projects, cursor = service.list_projects_cursor(limit=20)
            
            # Next page  
            projects, cursor = service.list_projects_cursor(cursor=cursor, limit=20)
        """
        limit = min(limit, 100)
        
        return self.repository.get_with_cursor(
            cursor=cursor,
            limit=limit,
            status=status,
            client_id=client_id
        )
    
    async def update_project(
        self,
        project_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        end_date_planned: Optional[date] = None,
        observations: Optional[str] = None,
        estimated_value: Optional[str] = None,
        status: Optional[ProjectStatus] = None
    ) -> Project:
        """
        Update project details with cache invalidation.
        
        Business Rule: Cannot modify completed/cancelled projects (enforced by domain).
        Exception: If status is provided, force_status_change bypasses restrictions.
        
        Args:
            project_id: Project to update
            name: New name (optional)
            description: New description (optional)
            end_date_planned: New planned end date (optional)
            observations: New observations (optional)
            estimated_value: New estimated value (optional)
            status: Force new status (optional, bypasses transition rules)
            
        Returns:
            Updated project
            
        Raises:
            ProjectNotFoundError: If project doesn't exist
            BusinessRuleViolationError: If trying to modify immutable project (unless status override)
        """
        # Retrieve existing project (will use cache if available)
        project = await self.get_project(project_id)
        
        # Handle status change first (if provided) - bypasses normal restrictions
        if status is not None:
            project.force_status_change(status)
            logger.info(
                "project_status_forced",
                project_id=project_id,
                new_status=status.value
            )
        
        # Use domain method to update other fields (enforces business rules)
        # Note: If project was completed/cancelled and status wasn't changed,
        # update_details will raise BusinessRuleViolationError
        if any(
            field is not None
            for field in [name, description, end_date_planned, observations, estimated_value]
        ):
            project.update_details(
                name=name,
                description=description,
                end_date_planned=end_date_planned,
                observations=observations,
                estimated_value=estimated_value
            )
        
        # Persist changes
        updated_project = self.repository.save(project)
        
        # Invalidate caches (project changed)
        await invalidate_project_cache(project_id)
        await invalidate_projects_list_cache()
        
        logger.info("project_updated_via_service", project_id=project_id)
        
        return updated_project
    
    async def delete_project(self, project_id: int, force: bool = False) -> bool:
        """
        Delete project with cache invalidation.
        If force=True, perform hard delete (physical removal).
        Else perform soft delete (if repository is configured that way).
        Currently repository.delete performs hard delete per requirements.
        """
        deleted = self.repository.delete(project_id)
        
        if deleted:
            # Invalidate caches (project deleted)
            await invalidate_project_cache(project_id)
            await invalidate_projects_list_cache()
            
            logger.info("project_deleted_via_service", project_id=project_id, force=force)
        
        return deleted
    
    # ========================================
    # Business Operations (Workflows)
    # ========================================
    
    async def start_project(self, project_id: int) -> Project:
        """
        Start a project (transition to EM_ANDAMENTO) with cache invalidation.
        
        Business Rule: Can only start from PLANEJAMENTO or PAUSADO.
        
        Args:
            project_id: Project to start
            
        Returns:
            Updated project
            
        Raises:
            ProjectNotFoundError: If project doesn't exist
            InvalidStateTransitionError: If cannot start from current state
        """
        project = await self.get_project(project_id)
        
        # Domain entity enforces state transition rules
        project.start()
        
        # Persist state change
        updated_project = self.repository.save(project)
        
        # Invalidate caches (status changed)
        await invalidate_project_cache(project_id)
        await invalidate_projects_list_cache()
        
        logger.info(
            "project_started",
            project_id=project_id,
            previous_status=ProjectStatus.PLANEJAMENTO.value
        )
        
        return updated_project
    
    async def pause_project(self, project_id: int) -> Project:
        """
        Pause an active project with cache invalidation.
        
        Business Rule: Can only pause active projects.
        """
        project = await self.get_project(project_id)
        project.pause()
        
        updated_project = self.repository.save(project)
        
        # Invalidate caches (status changed)
        await invalidate_project_cache(project_id)
        await invalidate_projects_list_cache()
        
        logger.info("project_paused", project_id=project_id)
        
        return updated_project
    
    async def complete_project(
        self,
        project_id: int,
        completion_date: Optional[date] = None
    ) -> Project:
        """
        Mark project as completed with cache invalidation.
        
        Business Rule: Can only complete active projects.
        
        Args:
            project_id: Project to complete
            completion_date: Actual completion date (defaults to today)
            
        Returns:
            Completed project
        """
        project = await self.get_project(project_id)
        project.complete(completion_date)
        
        updated_project = self.repository.save(project)
        
        # Invalidate caches (status changed + completion date set)
        await invalidate_project_cache(project_id)
        await invalidate_projects_list_cache()
        
        logger.info(
            "project_completed",
            project_id=project_id,
            duration_days=updated_project.duration_days
        )
        
        return updated_project
    
    async def cancel_project(self, project_id: int, reason: Optional[str] = None) -> Project:
        """
        Cancel project with cache invalidation.
        
        Business Rule: Cannot cancel completed projects.
        
        Args:
            project_id: Project to cancel
            reason: Cancellation reason (optional)
            
        Returns:
            Cancelled project
        """
        project = await self.get_project(project_id)
        project.cancel(reason)
        
        updated_project = self.repository.save(project)
        
        # Invalidate caches (status changed)
        await invalidate_project_cache(project_id)
        await invalidate_projects_list_cache()
        
        logger.info("project_cancelled", project_id=project_id, reason=reason or "Not specified")
        
        return updated_project
    
    # ========================================
    # Query Operations (Reports/Analytics)
    # ========================================
    
    def get_active_projects(self) -> List[Project]:
        """
        Get all currently active projects.
        
        Returns:
            List of active projects
        """
        return self.repository.get_active_projects()
    
    def get_overdue_projects(self) -> List[Project]:
        """
        Get projects that are past their deadline.
        
        Returns:
            List of overdue projects
        """
        return self.repository.get_overdue_projects()
    
    def get_client_projects(self, client_id: int) -> List[Project]:
        """
        Get all projects for a specific client.
        
        Args:
            client_id: Client identifier
            
        Returns:
            List of client's projects
        """
        return self.repository.get_by_client(client_id)

    def add_contributor(self, project_id: int, user_id: int) -> None:
        """Add a contributor to a project."""
        self.repository.add_contributor(project_id, user_id)
        
    def remove_contributor(self, project_id: int, user_id: int) -> None:
        """Remove a contributor from a project."""
        self.repository.remove_contributor(project_id, user_id)
        
    def get_contributors(self, project_id: int) -> List[Any]:
        """Get contributors for a project."""
        return self.repository.get_contributors(project_id)
    
    def get_project_statistics(self) -> dict:
        """
        Get project statistics across all statuses.
        
        Returns:
            Dictionary with counts per status
            
        Use Case: Dashboard widgets, reports
        """
        stats = {}
        
        for status in ProjectStatus:
            stats[status.value] = self.repository.count_by_status(status)
        
        stats["total_active"] = len(self.repository.get_active_projects())
        stats["total_overdue"] = len(self.repository.get_overdue_projects())
        
        logger.info("project_statistics_generated", stats=stats)
        
        return stats


# Service-specific exceptions
class ProjectServiceError(Exception):
    """Base exception for project service operations."""
    pass
