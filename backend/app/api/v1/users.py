"""
User management endpoints
"""
from typing import List
import logging
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserResponse, UserCreate, UserAdminPasswordUpdate
from app.schemas.common import SearchItemResponse
from app.services.user_service import UserService
from app.infrastructure.repositories.sqlalchemy_user_repository import SQLAlchemyUserRepository
from app.api.deps import get_current_active_user, require_admin

logger = logging.getLogger(__name__)
router = APIRouter()

def get_user_service(db: Session = Depends(get_db)) -> UserService:
    repository = SQLAlchemyUserRepository(db)
    return UserService(repository)

@router.post("/", response_model=UserResponse)
def create_user(
    user_data: UserCreate,
    service: UserService = Depends(get_user_service),
    current_user = Depends(require_admin)
):
    """
    Create a new user. Only admins can perform this action.
    """
    logger.info(f"[USER CREATE] Admin {current_user.email} creating user {user_data.email}")
    return service.create_user(user_data)


@router.get("/", response_model=List[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    service: UserService = Depends(get_user_service),
    current_user = Depends(require_admin)
):
    return service.get_all_users(skip, limit)

@router.get("/search", response_model=List[SearchItemResponse])
def search_users(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    service: UserService = Depends(get_user_service),
    current_user = Depends(get_current_active_user)
):
    logger.info(f"[USER SEARCH] Query: '{q}', Limit: {limit}")
    users = service.search_users(q, limit)
    logger.info(f"[USER SEARCH] Found {len(users)} users from DB")
    
    result = [SearchItemResponse(id=u.id, name=u.name, email=u.email) for u in users]
    logger.info(f"[USER SEARCH] Returning: {[r.model_dump() for r in result]}")
    return result


@router.put("/{user_id}/password", response_model=UserResponse)
def update_user_password(
    user_id: int,
    payload: UserAdminPasswordUpdate,
    service: UserService = Depends(get_user_service),
    current_user = Depends(require_admin)
):
    return service.update_user_password(user_id, payload.new_password)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    service: UserService = Depends(get_user_service),
    current_user = Depends(require_admin)
):
    service.delete_user(user_id, current_user.id)
