from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.user import User

class SQLAlchemyUserRepository:
    def __init__(self, session: Session):
        self.session = session

    def search(self, query: str, limit: int = 10) -> List[User]:
        return (
            self.session.query(User)
            .filter(
                or_(
                    User.name.ilike(f"%{query}%"),
                    User.email.ilike(f"%{query}%")
                )
            )
            .filter(User.deleted_at.is_(None))
            .order_by(User.name.asc())
            .limit(limit)
            .all()
        )

    def get_by_email(self, email: str) -> User | None:
        return self.session.query(User).filter(User.email == email).first()

    def get_by_id(self, user_id: int) -> Optional[User]:
        return (
            self.session.query(User)
            .filter(User.id == user_id, User.deleted_at.is_(None))
            .first()
        )

    def get_all(self, skip: int = 0, limit: int = 100) -> List[User]:
        return (
            self.session.query(User)
            .filter(User.deleted_at.is_(None))
            .order_by(User.name.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def update(self, user: User) -> User:
        self.session.commit()
        self.session.refresh(user)
        return user

    def soft_delete(self, user: User) -> None:
        from datetime import datetime

        user.deleted_at = datetime.utcnow()
        user.is_active = False
        self.session.commit()

    def create(self, user: User) -> User:
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user
