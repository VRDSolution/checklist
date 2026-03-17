from typing import List
from fastapi import HTTPException, status
from app.infrastructure.repositories.sqlalchemy_user_repository import SQLAlchemyUserRepository
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_password

class UserService:
    def __init__(self, repository: SQLAlchemyUserRepository):
        self.repository = repository

    def search_users(self, query: str, limit: int = 10) -> List[User]:
        return self.repository.search(query, limit)

    def create_user(self, data: UserCreate) -> User:
        # Check if user already exists
        if self.repository.get_by_email(data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
            
        # Create user
        user = User(
            name=data.name,
            email=data.email,
            hashed_password=hash_password(data.password),
            role=data.role,
            is_active=True
        )
        
        return self.repository.create(user)

    def get_all_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        return self.repository.get_all(skip, limit)

    def get_user_by_id(self, user_id: int) -> User:
        user = self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        return user

    def update_user_password(self, user_id: int, new_password: str) -> User:
        user = self.get_user_by_id(user_id)
        user.hashed_password = hash_password(new_password)
        return self.repository.update(user)

    def delete_user(self, user_id: int, current_user_id: int) -> None:
        if user_id == current_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é permitido excluir o próprio usuário"
            )

        user = self.get_user_by_id(user_id)
        self.repository.soft_delete(user)
