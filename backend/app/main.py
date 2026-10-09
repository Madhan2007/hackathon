from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import get_settings
from app.db.database import init_db
from app.routers import patients, cycles, followups, webhooks, appointments, analytics, audit, auth

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("fertiflow")

settings = get_settings()


from app.scheduler.config import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables on startup
    logger.info("Initializing FertiFlow database schema...")
    init_db()
    logger.info("Database schema initialized successfully.")

    # Start background scheduler
    start_scheduler()
    yield
    # Stop background scheduler
    stop_scheduler()
    logger.info("Shutting down FertiFlow AI backend.")


app = FastAPI(
    title="FertiFlow AI Backend",
    description="AI-powered fertility patient follow-up orchestration & clinical workflow engine",
    version="1.0.0",
    lifespan=lifespan,
)

# Setup CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_origin_regex=r"^https?://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(patients.router, prefix="/api/v1")
app.include_router(cycles.router, prefix="/api/v1")
app.include_router(followups.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(appointments.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")


@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": "FertiFlow AI Orchestration Engine",
        "environment": settings.ENVIRONMENT,
        "database_connected": True,
    }


@app.get("/", tags=["System"])
def root():
    return {
        "message": "Welcome to FertiFlow AI API",
        "documentation": "/docs",
        "health": "/health",
        "api_version": "v1"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
