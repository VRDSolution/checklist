"""
Checkin and related models for time tracking
"""
from sqlalchemy import Column, Integer, String, Text, Date, Time, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum
from datetime import datetime, time


class CheckinStatus(str, enum.Enum):
    """Checkin status options."""
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDO = "concluido"
    CANCELADO = "cancelado"


class Checkin(Base):
    """Checkin model representing time tracking sessions."""
    
    __tablename__ = "checkins"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    projeto_id = Column(Integer, ForeignKey("projetos.id"), nullable=False, index=True)
    
    # Time tracking
    data_inicio = Column(Date, nullable=False, index=True)
    hora_inicio = Column(Time, nullable=False)
    hora_chegada = Column(Time, nullable=True) # Added arrival time
    data_fim = Column(Date, index=True)
    hora_fim = Column(Time)
    duracao_minutos = Column(Integer)  # Calculated automatically
    
    # Status
    status = Column(Enum(CheckinStatus), default=CheckinStatus.EM_ANDAMENTO, nullable=False, index=True)
    
    # Location information (optional)
    localizacao_inicio = Column(String(500))
    localizacao_fim = Column(String(500))
    
    # Precise Geolocation
    start_lat = Column(String(50), nullable=True) # Storing as String to avoid precision issues in some DBs, or Float/Decimal
    start_lon = Column(String(50), nullable=True)
    end_lat = Column(String(50), nullable=True)
    end_lon = Column(String(50), nullable=True)
    is_auto_checkout = Column(Integer, default=0) # 0 = false, 1 = true (using Integer for compatibility or Boolean)
    
    # General observations
    observacoes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))  # For soft delete
    
    # Relationships
    usuario = relationship("User", back_populates="checkins")
    projeto = relationship("Project", back_populates="checkins")
    tarefas_executadas = relationship("TarefaExecutada", back_populates="checkin", cascade="all, delete-orphan")
    anexos = relationship("Attachment", back_populates="checkin", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Checkin(id={self.id}, usuario_id={self.usuario_id}, projeto_id={self.projeto_id}, status='{self.status}')>"
    
    @property
    def is_active(self) -> bool:
        """Check if checkin is active."""
        return self.status == CheckinStatus.EM_ANDAMENTO and self.deleted_at is None
    
    @property
    def duracao_formatada(self) -> str:
        """Return formatted duration (HH:MM)."""
        if not self.duracao_minutos:
            return "00:00"
        
        hours = self.duracao_minutos // 60
        minutes = self.duracao_minutos % 60
        return f"{hours:02d}:{minutes:02d}"
    
    def calculate_duration(self) -> int:
        """Calculate duration in minutes between start and end time."""
        if not (self.data_inicio and self.hora_inicio and self.data_fim and self.hora_fim):
            return 0
        
        start_datetime = datetime.combine(self.data_inicio, self.hora_inicio)
        end_datetime = datetime.combine(self.data_fim, self.hora_fim)
        
        delta = end_datetime - start_datetime
        return int(delta.total_seconds() / 60)


class TarefaExecutada(Base):
    """Model representing tasks executed during a checkin."""
    
    __tablename__ = "tarefas_executadas"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    checkin_id = Column(Integer, ForeignKey("checkins.id"), nullable=False, index=True)
    tarefa_id = Column(Integer, ForeignKey("tarefas.id"), nullable=False, index=True)
    
    # Task-specific observations
    observacao_tarefa = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    checkin = relationship("Checkin", back_populates="tarefas_executadas")
    tarefa = relationship("Task", back_populates="tarefas_executadas")
    
    def __repr__(self):
        return f"<TarefaExecutada(id={self.id}, checkin_id={self.checkin_id}, tarefa_id={self.tarefa_id})>"