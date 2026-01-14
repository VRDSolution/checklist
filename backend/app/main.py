"""
FastAPI main application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi import Request
import os

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.api.v1.router import api_router
from app.core.middleware import RequestIDMiddleware
from app.core.logging import get_logger
from app.core.limiter import limiter

# Import all models to ensure SQLAlchemy relationships are resolved
from app.db import base  # noqa: F401

# Initialize structured logger
logger = get_logger(__name__)

# Create FastAPI application
app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    description=settings.description,
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Connect limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware - configure allowed origins based on environment
allowed_origins = settings.allowed_origins

# In development, allow all origins for easier testing
if settings.environment == "development":
    allowed_origins = ["*"]

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Add Request ID middleware FIRST (before CORS) for proper header propagation
app.add_middleware(RequestIDMiddleware)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"]) # Configure specific hosts in production

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.api_v1_prefix)

# Mount static files (Frontend)
# Check if static directory exists (it will be created during build/deploy)
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve the frontend application."""
        # If API path, let it pass through (though router should catch it first)
        if full_path.startswith("api/"):
            return {"error": "Not Found"}
            
        # Check if file exists in static folder (e.g. favicon.ico)
        file_path = os.path.join(static_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # Otherwise serve index.html for React routing
        return FileResponse(os.path.join(static_dir, "index.html"))
else:
    @app.get("/")
    async def root():
        """Root endpoint for health check (when frontend is not built)."""
        return {
            "message": "Sistema de Check-in/Check-out API",
            "version": settings.version,
            "environment": settings.environment,
            "docs_url": "/docs"
        }

@app.get("/health")
async def health_check():
    """Health check endpoint with structured logging."""
    logger.info("health_check_requested", status="healthy", version=settings.version)
    return {"status": "healthy", "version": settings.version}

from sqlalchemy import text
from app.core.database import engine

@app.get("/api/debug-db")
async def debug_db():
    """
    Endpoint de diagnóstico para testar conexão com o banco de dados.
    Retorna erro detalhado se falhar.
    """
    try:
        # Tenta conectar e executar uma query simples
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            return {
                "status": "success", 
                "message": "Conexão com banco de dados estabelecida com sucesso!",
                "result": result.scalar(),
                # Retorna a URL mascarada para conferência
                "db_host": settings.db_host,
                "db_user": settings.db_user,
                "db_port": settings.db_port,
                "db_name": settings.db_name
            }
    except Exception as e:
        import traceback
        return {
            "status": "error", 
            "message": str(e), 
            "type": type(e).__name__,
            "traceback": traceback.format_exc()
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )