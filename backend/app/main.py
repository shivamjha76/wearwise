import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, Depends, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.models import User, StyleProfile, WardrobeItem, UploadedFile
from app.models.outfit import SavedOutfit
from app.core.storage import get_upload_dir

from app.routes.users import router as user_router
from app.routes.style_profiles import router as style_profile_router
from app.routes.wardrobe import router as wardrobe_router
from app.routes.outfits import router as outfit_router
from app.routes.auth import router as auth_router
from app.routes.stylist import router as stylist_router
from app.routes.weather import router as weather_router


def init_db():
    """Auto-create tables on launch or on-demand and migrate columns."""
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Base.metadata.create_all error: {e}")

    try:
        from sqlalchemy import inspect, text
        with engine.begin() as conn:
            inspector = inspect(conn)
            table_names = inspector.get_table_names()

            if "users" in table_names:
                user_cols = [c["name"] for c in inspector.get_columns("users")]
                if "avatar_url" not in user_cols:
                    try:
                        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)"))
                    except Exception:
                        try:
                            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)"))
                        except Exception:
                            pass
                if "phone" not in user_cols:
                    try:
                        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)"))
                    except Exception:
                        try:
                            conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(20)"))
                        except Exception:
                            pass

            if "style_profiles" in table_names:
                sp_cols = [c["name"] for c in inspector.get_columns("style_profiles")]
                style_cols = [
                    ("gender", "VARCHAR(50)"),
                    ("chest_bust", "VARCHAR(50)"),
                    ("waist_size", "VARCHAR(50)"),
                    ("hip_size", "VARCHAR(50)"),
                    ("top_size", "VARCHAR(30)"),
                    ("bottom_size", "VARCHAR(30)"),
                    ("shoe_size", "VARCHAR(30)"),
                ]
                for col_name, col_type in style_cols:
                    if col_name not in sp_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE style_profiles ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                        except Exception:
                            try:
                                conn.execute(text(f"ALTER TABLE style_profiles ADD COLUMN {col_name} {col_type}"))
                            except Exception:
                                pass
    except Exception as e:
        print(f"Warning: Database column migration error: {e}")


init_db()

UPLOAD_DIR = get_upload_dir()


app = FastAPI(
    title="WearWise API",
    version="1.0.0"
)

# CORS setup supporting localhost, Vercel deployments (*.vercel.app), and custom origins
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
custom_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    *custom_origins,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if not (custom_origins and custom_origins[0] == "*") else ["*"],
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    tb = traceback.format_exc()
    print(f"Server Error on {request.url.path}: {tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": tb}
    )


@app.middleware("http")
async def handle_api_prefix(request, call_next):
    """Allows endpoints to be reached with or without '/api' prefix seamlessly on Vercel."""
    path = request.scope.get("path", "")
    if path in ("/api/index.py", "/index.py", "/main.py"):
        request.scope["path"] = "/"
    elif path.startswith("/api/"):
        request.scope["path"] = path[4:]
    elif path == "/api":
        request.scope["path"] = "/"
    return await call_next(request)


@app.get("/uploads/{filename}")
def serve_upload_file(filename: str, db: Session = Depends(get_db)):
    """Serves uploaded media from disk, bundled repository storage, or database persistence."""
    # 1. Primary writable storage
    primary = UPLOAD_DIR / filename
    if primary.exists():
        return FileResponse(primary)

    # 2. Check repository static uploads
    repo_uploads = [
        Path(__file__).resolve().parent.parent / "uploads" / filename,
        Path(__file__).resolve().parent.parent.parent / "uploads" / filename,
    ]
    for candidate in repo_uploads:
        if candidate.exists():
            return FileResponse(candidate)

    # 3. Database persistence fallback (recovers files across stateless serverless instances)
    try:
        record = db.query(UploadedFile).filter(UploadedFile.filename == filename).first()
        if record and record.file_data:
            # Cache locally to disk on this instance for fast subsequent requests
            try:
                primary.parent.mkdir(parents=True, exist_ok=True)
                with open(primary, "wb") as f:
                    f.write(record.file_data)
            except Exception:
                pass
            return Response(
                content=record.file_data,
                media_type=record.content_type or "image/jpeg",
                headers={
                    "Cache-Control": "public, max-age=31536000, immutable"
                }
            )
    except Exception as e:
        print(f"Database upload fallback error for {filename}: {e}")

    raise HTTPException(status_code=404, detail="Uploaded file not found")
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(style_profile_router)
app.include_router(wardrobe_router)
app.include_router(outfit_router)
app.include_router(stylist_router)
app.include_router(weather_router)


@app.get("/")
def root():
    return {
        "message": "WearWise API is running 🚀"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.get("/debug-status")
def debug_status():
    from sqlalchemy import inspect
    init_db()
    tables = []
    db_err = None
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
    except Exception as e:
        db_err = str(e)

    url_str = str(engine.url)
    safe_url = url_str.split("@")[-1] if "@" in url_str else url_str

    return {
        "vercel": bool(os.getenv("VERCEL")),
        "database_backend": engine.url.get_backend_name(),
        "database_target": safe_url,
        "tables": tables,
        "db_error": db_err,
    }