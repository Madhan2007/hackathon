from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import Generator
from app.config import get_settings

settings = get_settings()
db_url = settings.normalized_database_url

# Configure connect_args and pooling based on dialect
connect_args = {}
engine_kwargs = {
    "echo": False,
    "future": True,
}

if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    engine_kwargs["connect_args"] = connect_args
else:
    # PostgreSQL / Supabase pool config
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_pre_ping"] = True

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db() -> Generator:
    """Dependency that yields a database session and ensures proper closure."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Creates all database tables based on registered SQLAlchemy models."""
    # Import all models here so that Base.metadata has all table definitions
    import app.models.patient  # noqa: F401
    import app.models.cycle  # noqa: F401
    import app.models.followup  # noqa: F401
    import app.models.appointment  # noqa: F401
    import app.models.audit  # noqa: F401
    import app.models.user  # noqa: F401

    Base.metadata.create_all(bind=engine)
