"""
Main API router aggregating all endpoints
"""
from fastapi import APIRouter
from app.api.v1 import auth, users, clients, projects, tasks, checkins, ai, sprints, analytics

# Create main API router
api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(checkins.router, prefix="/checkins", tags=["Checkins"])
api_router.include_router(sprints.router, prefix="/sprints", tags=["Sprints"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Assistant"])