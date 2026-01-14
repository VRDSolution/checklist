from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.models.user import User
from app.schemas.checkin import CheckinCreateFull, CheckinResponse, CheckinListResponse, CheckinStart, CheckinStop, CheckinUpdate
from app.services.checkin_service import CheckinService
from app.domain.repositories.checkin_repository import CheckinRepository
from app.db.session import get_db

router = APIRouter()

def get_checkin_service(db: Session = Depends(get_db)) -> CheckinService:
    repository = CheckinRepository(db)
    return CheckinService(repository)

@router.post("/start", response_model=CheckinResponse, status_code=status.HTTP_201_CREATED)
async def start_checkin(
    *,
    request: CheckinStart,
    service: CheckinService = Depends(get_checkin_service),
    current_user: User = Depends(get_current_active_user)
) -> CheckinResponse:
    request.user_id = current_user.id
    checkin = await service.start_checkin(request)
    return checkin

@router.post("/{checkin_id}/stop", response_model=CheckinResponse)
async def stop_checkin(
    *,
    checkin_id: int,
    request: CheckinStop,
    service: CheckinService = Depends(get_checkin_service),
    current_user: User = Depends(get_current_active_user)
) -> CheckinResponse:
    checkin = await service.stop_checkin(checkin_id, request, current_user.id)
    return checkin

@router.get("/active", response_model=Optional[CheckinResponse])
async def get_active_checkin(
    *,
    service: CheckinService = Depends(get_checkin_service),
    current_user: User = Depends(get_current_active_user)
) -> Optional[CheckinResponse]:
    checkin = await service.get_active_checkin(current_user.id)
    return checkin

@router.post("/full", response_model=CheckinResponse, status_code=status.HTTP_201_CREATED)
async def create_full_checkin(
    *,
    request: CheckinCreateFull,
    service: CheckinService = Depends(get_checkin_service),
    current_user: User = Depends(get_current_active_user)
) -> CheckinResponse:
    request.user_id = current_user.id
    checkin = await service.create_full_checkin(request)
    return checkin

@router.put("/{checkin_id}", response_model=CheckinResponse)
async def update_checkin(
    *,
    checkin_id: int,
    request: CheckinUpdate,
    service: CheckinService = Depends(get_checkin_service),
    current_user: User = Depends(get_current_active_user)
) -> CheckinResponse:
    if not current_user.is_admin:
        # Check if user owns the checkin (optional logic, but typically users can edit their own or admin only)
        # For now enforcing admin for historic edits or rely on service logic
        pass

    checkin = await service.update_checkin(checkin_id, request)
    return checkin

@router.get("/", response_model=CheckinListResponse)
async def list_checkins(
    *,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    service: CheckinService = Depends(get_checkin_service),
    current_user: User = Depends(get_current_active_user)
):
    skip = (page - 1) * size
    checkins = await service.get_history(skip=skip, limit=size)
    return {"items": checkins, "total": len(checkins)}

@router.delete("/{checkin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_checkin(
    *,
    checkin_id: int,
    service: CheckinService = Depends(get_checkin_service),
    current_user: User = Depends(get_current_active_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    success = await service.delete_checkin(checkin_id)
    if not success:
         raise HTTPException(status_code=404, detail="Checkin not found")