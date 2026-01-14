"""
Analytics API endpoints
"""
from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract

from app.api.deps import get_db, require_supervisor_or_admin
from app.models.checkin import Checkin, CheckinStatus
from app.models.project import Project, ProjectStatus
from app.models.user import User
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor_or_admin)
) -> Dict[str, Any]:
    """
    Get analytics dashboard data.
    Requires Supervisor or Admin role.
    """
    today = datetime.now()
    first_day_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # 1. Total hours per project (Current Month)
    # MySQL uses TIMEDIFF which returns time, need to convert to hours.
    # Or simplified: sum duracao_minutos if available.
    hours_per_project = db.query(
        Project.name,
        func.sum(func.coalesce(Checkin.duracao_minutos, 0) / 60).label("total_hours")
    ).join(Checkin).filter(
        Checkin.data_inicio >= first_day_of_month,
        Checkin.status == CheckinStatus.CONCLUIDO
    ).group_by(Project.id, Project.name).all()
    
    hours_data = [{"name": r.name, "hours": round(float(r.total_hours or 0), 1)} for r in hours_per_project if r.total_hours > 0]
    
    # 2. Top 5 Active Technicians (by completed checkins in current month)
    top_techs = db.query(
        User.name,
        func.count(Checkin.id).label("checkin_count"),
        func.sum(func.coalesce(Checkin.duracao_minutos, 0) / 60).label("total_hours")
    ).join(Checkin).filter(
        Checkin.data_inicio >= first_day_of_month,
        Checkin.status == CheckinStatus.CONCLUIDO
    ).group_by(User.id, User.name).order_by(func.count(Checkin.id).desc()).limit(5).all()
    
    techs_data = [
        {
            "name": t.name, 
            "checkins": t.checkin_count, 
            "hours": round(float(t.total_hours or 0), 1)
        } 
        for t in top_techs
    ]
    
    # 3. Project Status Overview
    project_status_counts = db.query(
        Project.status,
        func.count(Project.id).label("count")
    ).group_by(Project.status).all()
    
    status_data = [{"status": str(s.status).replace("ProjectStatus.", ""), "count": s.count} for s in project_status_counts]
    
    # 4. KPI Summaries (Today)
    today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
    
    checkins_today = db.query(func.count(Checkin.id)).filter(
        Checkin.data_inicio == today_start.date()
    ).scalar()
    
    active_now = db.query(func.count(Checkin.id)).filter(
        Checkin.status == CheckinStatus.EM_ANDAMENTO
    ).scalar()
    
    return {
        "hours_per_project": hours_data,
        "top_technicians": techs_data,
        "project_status": status_data,
        "kpis": {
            "checkins_today": checkins_today,
            "active_now": active_now
        }
    }
