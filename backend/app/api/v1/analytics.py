"""
Analytics API endpoints
"""
from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, defer
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
    try:
        today = datetime.now()
        first_day_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Fetch checkins for the current month with relations needed
        # We select specific columns to avoid 'duracao_minutos' column error in SELECT *
        month_checkins = db.query(
            Checkin.id,
            Checkin.data_inicio,
            Checkin.hora_inicio,
            Checkin.data_fim,
            Checkin.hora_fim,
            Checkin.status,
            Checkin.usuario_id,
            Checkin.projeto_id,
            User.name.label('user_name'),
            Project.nome.label('project_name')
        ).join(Project, Project.id == Checkin.projeto_id).join(User, User.id == Checkin.usuario_id).filter(
            Checkin.data_inicio >= first_day_of_month,
            Checkin.status == CheckinStatus.CONCLUIDO
        ).all()

        # Aggregation dictionaries
        project_hours = {}
        tech_stats = {}

        for row in month_checkins:
            # Calculate duration inline
            duration_mins = 0
            if row.data_inicio and row.hora_inicio and row.data_fim and row.hora_fim:
                try:
                    start = datetime.combine(row.data_inicio, row.hora_inicio)
                    end = datetime.combine(row.data_fim, row.hora_fim)
                    duration_mins = (end - start).total_seconds() / 60
                except Exception:
                    duration_mins = 0
            
            hours = duration_mins / 60.0

            # 1. Project stats
            p_name = row.project_name
            project_hours[p_name] = project_hours.get(p_name, 0) + hours

            # 2. Technician stats
            u_name = row.user_name
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
    except Exception as e:
        print(f"ERROR ANALYTICS: {e}")
        raise HTTPException(status_code=500, detail=str(e))
