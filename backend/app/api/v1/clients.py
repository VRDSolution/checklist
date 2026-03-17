"""
Client management endpoints
"""
from typing import List
import logging
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate
from app.schemas.common import SearchItemResponse
from app.services.client_service import ClientService
from app.infrastructure.repositories.sqlalchemy_client_repository import SQLAlchemyClientRepository
from app.api.deps import get_current_active_user, require_admin

logger = logging.getLogger(__name__)
router = APIRouter()

def get_client_service(db: Session = Depends(get_db)) -> ClientService:
    repository = SQLAlchemyClientRepository(db)
    return ClientService(repository)

@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    client: ClientCreate,
    service: ClientService = Depends(get_client_service),
    current_user = Depends(get_current_active_user)
):
    return service.create_client(client)

@router.get("/search", response_model=List[SearchItemResponse])
def search_clients(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    service: ClientService = Depends(get_client_service),
    current_user = Depends(get_current_active_user)
):
    logger.info(f"[CLIENT SEARCH] Query: '{q}', Limit: {limit}")
    clients = service.search_clients(q, limit)
    logger.info(f"[CLIENT SEARCH] Found {len(clients)} clients from DB")
    
    result = [SearchItemResponse(id=c.id, name=c.nome) for c in clients]
    logger.info(f"[CLIENT SEARCH] Returning: {[r.model_dump() for r in result]}")
    return result

@router.get("/", response_model=List[ClientResponse])
def list_clients(
    skip: int = 0,
    limit: int = 100,
    service: ClientService = Depends(get_client_service),
    current_user = Depends(get_current_active_user)
):
    return service.get_all_clients(skip, limit)


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    client_data: ClientUpdate,
    service: ClientService = Depends(get_client_service),
    current_user = Depends(require_admin)
):
    return service.update_client(client_id, client_data)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    service: ClientService = Depends(get_client_service),
    current_user = Depends(require_admin)
):
    service.delete_client(client_id)
