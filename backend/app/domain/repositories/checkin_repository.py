from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from app.models.checkin import Checkin, CheckinStatus

class CheckinRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, checkin: Checkin) -> Checkin:
        self.session.add(checkin)
        self.session.commit()
        self.session.refresh(checkin)
        return checkin
    
    def update(self, checkin: Checkin) -> Checkin:
        self.session.add(checkin)
        self.session.commit()
        self.session.refresh(checkin)
        return checkin

    def get_by_id(self, checkin_id: int) -> Optional[Checkin]:
        return self.session.query(Checkin).filter(Checkin.id == checkin_id).first()

    def get_active_by_user(self, user_id: int) -> Optional[Checkin]:
        return (
            self.session.query(Checkin)
            .options(joinedload(Checkin.projeto))
            .filter(
                Checkin.usuario_id == user_id,
                Checkin.status == CheckinStatus.EM_ANDAMENTO
            )
            .first()
        )

    def get_all(self, skip: int = 0, limit: int = 100) -> List[Checkin]:
        return (
            self.session.query(Checkin)
            .options(joinedload(Checkin.projeto))
            .order_by(desc(Checkin.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def delete(self, checkin_id: int) -> bool:
        checkin = self.get_by_id(checkin_id)
        if checkin:
            self.session.delete(checkin)
            self.session.commit()
            return True
        return False
