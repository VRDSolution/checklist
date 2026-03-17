"""
Client model for customer management
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Client(Base):
    """Client model representing customers."""
    
    __tablename__ = "clientes"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic client information
    nome = Column(String(100), nullable=False, index=True)
    cnpj = Column(String(18), unique=True, nullable=False, index=True)  # Format: 12.345.678/0001-90
    
    # Contact information
    telefone = Column(String(20))
    email = Column(String(100))
    
    # Address information
    endereco = Column(Text)
    cidade = Column(String(100), nullable=False, index=True)
    estado = Column(String(2), nullable=False)  # UF
    cep = Column(String(9))  # Format: 12345-678
    
    # Additional information
    observacoes = Column(Text)
    
    # Status
    ativo = Column(Integer, default=1, nullable=False)  # 1=Ativo, 0=Inativo
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))  # For soft delete
    
    # Relationships
    projetos = relationship("Project", back_populates="client")
    
    def __repr__(self):
        return f"<Client(id={self.id}, nome='{self.nome}', cnpj='{self.cnpj}')>"
    
    @property
    def is_active(self) -> bool:
        """Check if client is active."""
        return self.ativo == 1 and self.deleted_at is None

    @property
    def projects_count(self) -> int:
        """Count active linked projects."""
        return len([projeto for projeto in self.projetos if projeto.deleted_at is None])

    @property
    def has_projects(self) -> bool:
        """Indicates whether client has linked active projects."""
        return self.projects_count > 0