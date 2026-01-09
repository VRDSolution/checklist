from typing import Optional
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.domain.repositories.checkin_repository import CheckinRepository
from app.schemas.checkin import CheckinCreateFull, CheckinStart, CheckinStop
from app.models.checkin import Checkin, CheckinStatus

class CheckinService:
    def __init__(self, repository: CheckinRepository):
        self.repository = repository

    async def start_checkin(self, data: CheckinStart) -> Checkin:
        # Check if user already has an active checkin
        active = self.repository.get_active_by_user(data.user_id)
        if active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has an active check-in."
            )

        checkin = Checkin(
            projeto_id=data.project_id,
            usuario_id=data.user_id,
            data_inicio=data.start_time.date(),
            hora_inicio=data.start_time.time(),
            hora_chegada=data.arrival_time.time() if data.arrival_time else data.start_time.time(),
            status=CheckinStatus.EM_ANDAMENTO
        )
        
        try:
            return self.repository.create(checkin)
        except IntegrityError as e:
            # Check if it's a foreign key violation for project_id
            error_msg = str(e).lower()
            if "foreign key constraint fails" in error_msg and "projeto_id" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Project with ID {data.project_id} does not exist. Ensure the project is created before submitting the check-in."
                )
            raise e

    async def stop_checkin(self, checkin_id: int, data: CheckinStop, user_id: int) -> Checkin:
        checkin = self.repository.get_by_id(checkin_id)
        if not checkin:
            raise HTTPException(status_code=404, detail="Check-in not found")
            
        if checkin.usuario_id != user_id:
             raise HTTPException(status_code=403, detail="Not authorized")

        if checkin.status != CheckinStatus.EM_ANDAMENTO:
            raise HTTPException(status_code=400, detail="Check-in is not active")

        # Calculate duration
        # Ensure start_dt is offset-naive for calculation if end_time is naive, or both aware
        start_dt = datetime.combine(checkin.data_inicio, checkin.hora_inicio)
        
        # Handle timezone awareness mismatch
        end_dt = data.end_time
        if start_dt.tzinfo is None and end_dt.tzinfo is not None:
            start_dt = start_dt.replace(tzinfo=end_dt.tzinfo)
        elif start_dt.tzinfo is not None and end_dt.tzinfo is None:
            end_dt = end_dt.replace(tzinfo=start_dt.tzinfo)
            
        duration_minutes = int((end_dt - start_dt).total_seconds() / 60)
        
        activities_str = "\nActivities: " + ", ".join(data.activities) if data.activities else ""
        full_observations = (data.observations or "") + activities_str

        checkin.data_fim = data.end_time.date()
        checkin.hora_fim = data.end_time.time()
        checkin.duracao_minutos = duration_minutes
        checkin.status = CheckinStatus.CONCLUIDO
        checkin.observacoes = full_observations
        
        return self.repository.update(checkin)

    async def get_active_checkin(self, user_id: int) -> Optional[Checkin]:
        return self.repository.get_active_by_user(user_id)

    async def create_full_checkin(self, data: CheckinCreateFull) -> Checkin:
        # Calculate duration
        duration_minutes = int((data.end_time - data.start_time).total_seconds() / 60)
        
        # Format activities into observations if needed
        activities_str = "\nActivities: " + ", ".join(data.activities) if data.activities else ""
        full_observations = (data.observations or "") + activities_str

        checkin = Checkin(
            projeto_id=data.project_id,
            usuario_id=data.user_id,
            data_inicio=data.start_time.date(),
            hora_inicio=data.start_time.time(),
            data_fim=data.end_time.date(),
            hora_fim=data.end_time.time(),
            duracao_minutos=duration_minutes,
            status=CheckinStatus.CONCLUIDO,
            observacoes=full_observations
        )
        
        try:
            return self.repository.create(checkin)
        except IntegrityError as e:
            # Check if it's a foreign key violation for project_id
            error_msg = str(e).lower()
            if "foreign key constraint fails" in error_msg and "projeto_id" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Project with ID {data.project_id} does not exist. Ensure the project is created before submitting the check-in."
                )
            raise e

    async def get_history(self, skip: int = 0, limit: int = 100):
        return self.repository.get_all(skip, limit)

    async def delete_checkin(self, checkin_id: int) -> bool:
        return self.repository.delete(checkin_id)
