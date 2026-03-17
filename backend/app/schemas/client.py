from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class ClientBase(BaseModel):
    name: str = Field(alias="nome")
    cnpj: str
    phone: Optional[str] = Field(None, alias="telefone")
    email: Optional[str] = None
    address: Optional[str] = Field(None, alias="endereco")
    city: str = Field(alias="cidade")
    state: str = Field(alias="estado")
    zip_code: Optional[str] = Field(None, alias="cep")

    class Config:
        populate_by_name = True
        from_attributes = True

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = Field(None, alias="nome")
    cnpj: Optional[str] = None
    phone: Optional[str] = Field(None, alias="telefone")
    email: Optional[str] = None
    address: Optional[str] = Field(None, alias="endereco")
    city: Optional[str] = Field(None, alias="cidade")
    state: Optional[str] = Field(None, alias="estado")
    zip_code: Optional[str] = Field(None, alias="cep")

    class Config:
        populate_by_name = True

class ClientResponse(BaseModel):
    """
    Response schema for Client.
    Decoupled from ClientBase to avoid alias conflicts.
    """
    id: int
    name: str = Field(validation_alias="nome", serialization_alias="name")
    cnpj: str
    phone: Optional[str] = Field(None, validation_alias="telefone", serialization_alias="phone")
    email: Optional[str] = None
    address: Optional[str] = Field(None, validation_alias="endereco", serialization_alias="address")
    city: str = Field(validation_alias="cidade", serialization_alias="city")
    state: str = Field(validation_alias="estado", serialization_alias="state")
    zip_code: Optional[str] = Field(None, validation_alias="cep", serialization_alias="zip_code")
    projects_count: int = Field(0, validation_alias="projects_count", serialization_alias="projects_count")
    has_projects: bool = Field(False, validation_alias="has_projects", serialization_alias="has_projects")
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        from_attributes = True
