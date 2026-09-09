import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker


APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parent

load_dotenv(APP_DIR / ".env")
load_dotenv(PROJECT_ROOT / ".env")


def build_database_url():
    # 1. Direct DATABASE_URL or POSTGRES_URL (standard for Supabase, Neon, Vercel Postgres, Railway)
    raw_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
    if raw_url:
        # SQLAlchemy 1.4+ requires postgresql:// instead of postgres://
        if raw_url.startswith("postgres://"):
            raw_url = raw_url.replace("postgres://", "postgresql://", 1)
        if os.getenv("VERCEL") and ("@localhost" in raw_url or "@127.0.0.1" in raw_url):
            raw_url = None
        else:
            return raw_url

    # 2. Individual database connection parameters
    db_user = os.getenv("DATABASE_USER")
    db_password = os.getenv("DATABASE_PASSWORD")
    db_host = os.getenv("DATABASE_HOST")
    db_port = os.getenv("DATABASE_PORT")
    db_name = os.getenv("DATABASE_NAME")

    # On Vercel, localhost/127.0.0.1 PostgreSQL cannot be reached
    if os.getenv("VERCEL") and db_host in ("localhost", "127.0.0.1"):
        db_host = None

    if all([db_user, db_password, db_host, db_port, db_name]):
        return (
            f"postgresql+psycopg2://"
            f"{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        )

    # 3. Serverless fallback on Vercel
    if os.getenv("VERCEL"):
        tmp_db = Path("/tmp/wearwise.db")
        if not tmp_db.exists():
            # Seed from bundled SQLite database if available
            for candidate in [PROJECT_ROOT / "wearwise.db", APP_DIR.parent / "wearwise.db", APP_DIR / "wearwise.db"]:
                if candidate.exists():
                    import shutil
                    try:
                        shutil.copyfile(candidate, tmp_db)
                        break
                    except Exception:
                        pass
        return "sqlite:////tmp/wearwise.db"

    return "sqlite:///./wearwise.db"


DATABASE_URL = build_database_url()
engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)

if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()