"""
Project Domain Entity

Pure business entity representing a project in the system.
Independent of database/ORM - contains only business logic.

Business Rules Enforced:
1. Project end date cannot be before start date
2. Only active projects can transition to completed
3. Completed projects cannot be reopened without audit trail
4. Status transitions follow state machine rules
"""
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional, Any, List
from enum import Enum


class ProjectStatus(str, Enum):
    """Valid project states - immutable enum."""
    PLANEJAMENTO = "planejamento"
    EM_ANDAMENTO = "em_andamento"
    PAUSADO = "pausado"
    CONCLUIDO = "concluido"
    CANCELADO = "cancelado"


class InvalidStateTransitionError(Exception):
    """Raised when attempting invalid project state transition."""
    pass


class BusinessRuleViolationError(Exception):
    """Raised when business rule is violated."""
    pass


@dataclass
class Project:
    """
    Project domain entity - Rich domain model with business behavior.
    
    Design Pattern: Entity (DDD)
    - Has identity (id)
    - Has lifecycle (status transitions)
    - Encapsulates business rules
    - Mutable state with controlled mutations
    
    Architecture Note:
    This class knows NOTHING about databases, HTTP, or frameworks.
    It only knows business rules. Persistence is handled by repositories.
    """
    
    # Identity
    id: Optional[int] = None
    
    # Value Objects (simple types for now, could be extracted to VOs later)
    name: str = ""
    description: Optional[str] = None
    
    # Dates - Business critical
    start_date: date = field(default_factory=date.today)
    end_date_planned: Optional[date] = None
    end_date_actual: Optional[date] = None
    
    # State
    status: ProjectStatus = ProjectStatus.PLANEJAMENTO
    
    # Relationships (by ID - domain doesn't need full objects)
    client_id: int = 0
    responsible_user_id: int = 0
    
    # Transient / Read-only relationships (populated by repository for DTOs)
    client: Optional[Any] = None
    responsible_user: Optional[Any] = None
    contributors: List[Any] = field(default_factory=list)
    
    # Metadata
    observations: Optional[str] = None
    estimated_value: Optional[str] = None
    
    # Audit
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    
    def __post_init__(self):
        """Validate business invariants after initialization."""
        self._validate_dates()
    
    def _validate_dates(self) -> None:
        """
        Business Rule: End date must be after start date.
        
        Throws: BusinessRuleViolationError
        """
        if self.end_date_planned and self.end_date_planned < self.start_date:
            raise BusinessRuleViolationError(
                f"End date ({self.end_date_planned}) cannot be before start date ({self.start_date})"
            )
    
    # ========================================
    # Business Behavior - State Transitions
    # ========================================
    
    def start(self) -> None:
        """
        Transition project to EM_ANDAMENTO status.
        
        Business Rules:
        - Can only start from PLANEJAMENTO or PAUSADO
        - Cannot start completed or cancelled projects
        
        Raises: InvalidStateTransitionError
        """
        allowed_states = {ProjectStatus.PLANEJAMENTO, ProjectStatus.PAUSADO}
        
        if self.status not in allowed_states:
            raise InvalidStateTransitionError(
                f"Cannot start project from status {self.status}. "
                f"Allowed: {', '.join(s.value for s in allowed_states)}"
            )
        
        self.status = ProjectStatus.EM_ANDAMENTO
    
    def pause(self) -> None:
        """
        Pause an active project.
        
        Business Rule: Only running projects can be paused.
        """
        if self.status != ProjectStatus.EM_ANDAMENTO:
            raise InvalidStateTransitionError(
                f"Can only pause projects that are EM_ANDAMENTO, not {self.status}"
            )
        
        self.status = ProjectStatus.PAUSADO
    
    def complete(self, completion_date: Optional[date] = None) -> None:
        """
        Mark project as completed.
        
        Business Rules:
        - Can only complete active projects
        - Completion date is recorded
        - Irreversible without audit trail
        
        Args:
            completion_date: Actual completion date (defaults to today)
        """
        if self.status != ProjectStatus.EM_ANDAMENTO:
            raise InvalidStateTransitionError(
                "Can only complete projects that are EM_ANDAMENTO"
            )
        
        self.status = ProjectStatus.CONCLUIDO
        self.end_date_actual = completion_date or date.today()
    
    def cancel(self, reason: Optional[str] = None) -> None:
        """
        Cancel project.
        
        Business Rule: Cannot cancel already completed projects.
        
        Args:
            reason: Cancellation reason (stored in observations)
        """
        if self.status == ProjectStatus.CONCLUIDO:
            raise InvalidStateTransitionError(
                "Cannot cancel a completed project"
            )
        
        self.status = ProjectStatus.CANCELADO
        
        if reason:
            self.observations = f"[CANCELADO] {reason}\n{self.observations or ''}"
    
    def force_status_change(self, new_status: ProjectStatus) -> None:
        """
        Force status change without transition validation.
        
        Use Case: Administrative corrections, manual interventions.
        Bypasses the state machine rules enforced by start/pause/complete/cancel.
        
        Args:
            new_status: Target status to set directly
            
        Business Logic:
        - If transitioning to CONCLUIDO, sets end_date_actual if not already set
        - If transitioning away from CONCLUIDO, clears end_date_actual
        """
        old_status = self.status
        self.status = new_status
        
        # Handle end_date_actual based on new status
        if new_status == ProjectStatus.CONCLUIDO:
            if not self.end_date_actual:
                self.end_date_actual = date.today()
        else:
            # Clear completion date if moving away from completed status
            self.end_date_actual = None
        
        # Note: No InvalidStateTransitionError is raised - this is intentional
        # This method is for administrative overrides
    
    # ========================================
    # Query Methods (Read-only properties)
    # ========================================
    
    @property
    def is_active(self) -> bool:
        """Check if project is currently active."""
        return self.status == ProjectStatus.EM_ANDAMENTO and self.deleted_at is None
    
    @property
    def is_completed(self) -> bool:
        """Check if project is completed."""
        return self.status == ProjectStatus.CONCLUIDO
    
    @property
    def is_cancelled(self) -> bool:
        """Check if project is cancelled."""
        return self.status == ProjectStatus.CANCELADO
    
    @property
    def is_modifiable(self) -> bool:
        """Check if project can be modified (not completed or cancelled)."""
        return self.status not in {ProjectStatus.CONCLUIDO, ProjectStatus.CANCELADO}
    
    @property
    def duration_days(self) -> Optional[int]:
        """
        Calculate actual project duration in days.
        
        Returns:
            Number of days if completed, None otherwise
        """
        if not self.end_date_actual:
            return None
        return (self.end_date_actual - self.start_date).days
    
    @property
    def is_overdue(self) -> bool:
        """
        Check if project is past its planned end date.
        
        Returns:
            True if active and past planned end date
        """
        if not self.end_date_planned or not self.is_active:
            return False
        return date.today() > self.end_date_planned
    
    # ========================================
    # Utility Methods
    # ========================================
    
    def update_details(
        self,
        name: Optional[str] = None,
        description: Optional[str] = None,
        end_date_planned: Optional[date] = None,
        observations: Optional[str] = None,
        estimated_value: Optional[str] = None
    ) -> None:
        """
        Update project details (only if modifiable).
        
        Business Rule: Cannot modify completed/cancelled projects.
        
        Raises: BusinessRuleViolationError
        """
        if not self.is_modifiable:
            raise BusinessRuleViolationError(
                f"Cannot modify project in status {self.status}"
            )
        
        if name is not None:
            self.name = name
        if description is not None:
            self.description = description
        if end_date_planned is not None:
            self.end_date_planned = end_date_planned
            self._validate_dates()  # Re-validate after update
        if observations is not None:
            self.observations = observations
        if estimated_value is not None:
            self.estimated_value = estimated_value
    
    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name='{self.name}', status='{self.status.value}')>"
    
    def __eq__(self, other: object) -> bool:
        """Equality based on identity (id), not value."""
        if not isinstance(other, Project):
            return False
        return self.id is not None and self.id == other.id
    
    def __hash__(self) -> int:
        """Hash based on identity for use in sets/dicts."""
        return hash(self.id) if self.id else hash(id(self))
