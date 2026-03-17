from typing import List
from fastapi import HTTPException, status
from app.infrastructure.repositories.sqlalchemy_client_repository import SQLAlchemyClientRepository
from app.schemas.client import ClientCreate, ClientUpdate
from app.models.client import Client

class ClientService:
    def __init__(self, repository: SQLAlchemyClientRepository):
        self.repository = repository

    def create_client(self, client_data: ClientCreate) -> Client:
        return self.repository.create(client_data)

    def search_clients(self, query: str, limit: int = 10) -> List[Client]:
        return self.repository.search(query, limit)

    def get_all_clients(self, skip: int = 0, limit: int = 100) -> List[Client]:
        return self.repository.get_all(skip, limit)

    def get_client_by_id(self, client_id: int) -> Client:
        client = self.repository.get_by_id(client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empresa não encontrada"
            )
        return client

    def update_client(self, client_id: int, client_data: ClientUpdate) -> Client:
        client = self.get_client_by_id(client_id)
        return self.repository.update(client, client_data)

    def delete_client(self, client_id: int) -> None:
        client = self.get_client_by_id(client_id)
        active_projects_count = self.repository.count_active_projects(client_id)

        if active_projects_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empresa possui projeto vinculado e não pode ser excluída"
            )

        self.repository.soft_delete(client)
