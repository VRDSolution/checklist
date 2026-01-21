from typing import Optional, List, Any
from datetime import datetime, date, time, timezone
from pydantic import BaseModel, Field, model_validator, ConfigDict

class CheckinBase(BaseModel):
    pass

class CheckinCreateFull(BaseModel):
    project_id: int
    arrival_time: datetime
    start_time: datetime
    end_time: datetime
    activities: List[str]
    observations: Optional[str] = None
    user_id: Optional[int] = None

class CheckinStart(BaseModel):
    project_id: int
    start_time: datetime = Field(default_factory=datetime.now)
    arrival_time: Optional[datetime] = None
    user_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class CheckinStop(BaseModel):
    end_time: datetime = Field(default_factory=datetime.now)
    activities: List[str]
    observations: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_auto_checkout: bool = False

class CheckinUpdate(BaseModel):
    arrival_time: Optional[datetime] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    observations: Optional[str] = None

class ProjectSummary(BaseModel):
    name: str

class CheckinResponse(BaseModel):
    id: int
    project_id: int = Field(..., validation_alias='projeto_id', serialization_alias='project_id')
    user_id: int = Field(..., validation_alias='usuario_id', serialization_alias='user_id')
    created_at: datetime
    
    # Computed fields
    arrival_time: Optional[datetime] = Field(None, validation_alias='hora_chegada', serialization_alias='arrival_time')
    start_time: Optional[datetime] = None
    
    start_lat: Optional[float] = None
    start_lon: Optional[float] = None
    end_lat: Optional[float] = None
    end_lon: Optional[float] = None
    is_auto_checkout: int = 0
    checkout_time: Optional[datetime] = None
    total_hours: Optional[float] = None
    observations: Optional[str] = Field(None, validation_alias='observacoes')
    status: str
    
    project: Optional[ProjectSummary] = None
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @model_validator(mode='before')
    @classmethod
    def from_orm_model(cls, data: Any) -> Any:
        # Check if it's an SQLAlchemy model (has __table__ or similar, or just check attributes)
        if hasattr(data, 'data_inicio'): 
            # Construct datetimes
            start_dt = None
            if data.data_inicio and data.hora_inicio:
                # Combine date and time
                dt = datetime.combine(data.data_inicio, data.hora_inicio)
                # Ensure it's UTC aware if naive
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                start_dt = dt
            
            arrival_dt = None
            if hasattr(data, 'hora_chegada') and data.hora_chegada and data.data_inicio:
                 # Combine date (from start) and arrival time
                dt = datetime.combine(data.data_inicio, data.hora_chegada)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                arrival_dt = dt
            elif start_dt:
                # Fallback to start time if arrival not set
                arrival_dt = start_dt

            end_dt = None
            if data.data_fim and data.hora_fim:
                dt = datetime.combine(data.data_fim, data.hora_fim)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                end_dt = dt
            
            # Calculate total hours
            total_hours = 0
            if data.duracao_minutos:
                total_hours = data.duracao_minutos / 60.0
            
            # Map project
            project_data = None
            if hasattr(data, 'projeto') and data.projeto:
                project_data = {"name": data.projeto.nome}
            
            return {
                "id": data.id,
                "project_id": data.projeto_id,
                "user_id": data.usuario_id,
                "created_at": data.created_at,
                "arrival_time": arrival_dt,
                "start_time": start_dt,
                "checkout_time": end_dt,
                "total_hours": total_hours,
                "start_lat": getattr(data, 'start_lat', None),
                "start_lon": getattr(data, 'start_lon', None),
                "end_lat": getattr(data, 'end_lat', None),
                "end_lon": getattr(data, 'end_lon', None),
                "is_auto_checkout": getattr(data, 'is_auto_checkout', 0) or 0,
                "observations": data.observacoes,
                "status": data.status.value if hasattr(data.status, 'value') else data.status,
                "project": project_data
            }
        return data

class CheckinListResponse(BaseModel):
    items: List[CheckinResponse]
    total: int

