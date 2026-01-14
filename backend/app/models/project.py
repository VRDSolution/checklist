"""
Project model for project management
"""
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Enum, ForeignKey, func, Table
from sqlalchemy.orm import relationship, synonym
from app.core.database import Base
import enum


# Association table for Project Contributors (Many-to-Many)
project_contributors = Table(
    'project_contributors',
    Base.metadata,
    Column('project_id', Integer, ForeignKey('projetos.id'), primary_key=True),
    Column('user_id', Integer, ForeignKey('usuarios.id'), primary_key=True),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)


class ProjectStatus(str, enum.Enum):
    """Project status options."""
    PLANEJAMENTO = "planejamento"
    EM_ANDAMENTO = "em_andamento"
    PAUSADO = "pausado"
    CONCLUIDO = "concluido"
    CANCELADO = "cancelado"


class Project(Base):
    """Project model representing work projects."""
    
    __tablename__ = "projetos"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic project information
    nome = Column(String(200), nullable=False, index=True)
    descricao = Column(Text)
    
    # Project dates
    data_inicio = Column(Date, nullable=False)
    data_fim_prevista = Column(Date)
    data_fim_real = Column(Date)
    
    # Status
    status = Column(Enum(ProjectStatus), default=ProjectStatus.PLANEJAMENTO, nullable=False, index=True)
    
    # Foreign keys
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False, index=True)
    responsavel_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    
    # Additional information
    observacoes = Column(Text)
    valor_estimado = Column(String(20))  # Stored as string for flexibility
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))  # For soft delete
    
    # Relationships
    client = relationship("Client", back_populates="projetos")
    responsavel = relationship("User", back_populates="projetos")
    contributors = relationship("User", secondary=project_contributors, backref="contributed_projects")
    checkins = relationship("Checkin", back_populates="projeto")

    # English aliases so both naming conventions work across the codebase
    name = synonym("nome")
    description = synonym("descricao")
    start_date = synonym("data_inicio")
    end_date_planned = synonym("data_fim_prevista")
    end_date_actual = synonym("data_fim_real")
    client_id = synonym("cliente_id")
    responsible_user_id = synonym("responsavel_id")
    observations = synonym("observacoes")
    estimated_value = synonym("valor_estimado")
    
    def __repr__(self):
        return f"<Project(id={self.id}, nome='{self.nome}', status='{self.status}')>"
    
    @property
    def is_active(self) -> bool:
        """Check if project is active."""
        return self.status == ProjectStatus.EM_ANDAMENTO and self.deleted_at is None
    
    @property
    def is_completed(self) -> bool:
        """Check if project is completed."""
        return self.status == ProjectStatus.CONCLUIDO
    
    @property
    def duration_days(self) -> int:
        """Calculate project duration in days."""
        if not self.data_fim_real:
            return 0
        return (self.data_fim_real - self.data_inicio).days