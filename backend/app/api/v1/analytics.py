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
    
    # Fetch checkins for the current month with relations needed
    # We calculate aggregation in Python to avoid database schema inconsistencies with 'duracao_minutos'
    month_checkins = db.query(Checkin).join(Project).join(User).filter(
        Checkin.data_inicio >= first_day_of_month,
        Checkin.status == CheckinStatus.CONCLUIDO
    ).all()

    # Aggregation dictionaries
    project_hours = {}
    tech_stats = {}

    for checkin in month_checkins:
        # Determine duration safely
        duration_mins = 0
        if getattr(checkin, 'duracao_minutos', None):
            duration_mins = checkin.duracao_minutos
        else:
            # Fallback using model method if column missing/empty
            duration_mins = checkin.calculate_duration()
        
        hours = duration_mins / 60.0

        # 1. Project stats
        p_name = checkin.projeto.name
        project_hours[p_name] = project_hours.get(p_name, 0) + hours

        # 2. Technician stats
        u_name = checkin.usuario.name
        if u_name not in tech_stats:
            tech_stats[u_name] = {"checkins": 0, "hours": 0}
        tech_stats[u_name]["checkins"] += 1
        tech_stats[u_name]["hours"] += hours

    # Format 1. Hours per Project
    hours_data = [
        {"name": name, "hours": round(hours, 1)} 
        for name, hours in project_hours.items() 
        if hours > 0
    ]
    
    # Format 2. Top Technically
    # define sort based on checkin count
    sorted_techs = sorted(tech_stats.items(), key=lambda item: item[1]['checkins'], reverse=True)[:5]
    
    techs_data = [
        {
            "name": name, 
            "checkins": stats["checkins"], 
            "hours": round(stats["hours"], 1)
        } 
        for name, stats in sorted_techs
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
