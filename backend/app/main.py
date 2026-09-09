import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models import User, StyleProfile, WardrobeItem
from app.core.storage import get_upload_dir

from app.routes.users import router as user_router
from app.routes.style_profiles import router as style_profile_router
from app.routes.wardrobe import router as wardrobe_router
from app.routes.outfits import router as outfit_router
from app.routes.auth import router as auth_router
from app.routes.stylist import router as stylist_router
from app.routes.weather import router as weather_router


# Auto-create tables on launch (non-blocking if already created)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Database metadata initialization error: {e}")

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
def serve_upload_file(filename: str):
    """Serves uploaded media from writable temp storage or bundled repository storage."""
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
    tables = []
    db_err = None
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
    except Exception as e:
        db_err = str(e)

    return {
        "vercel": bool(os.getenv("VERCEL")),
        "database_type": "postgres" if (os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")) else "sqlite",
        "has_database_url": bool(os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")),
        "tables": tables,
        "db_error": db_err,
    }