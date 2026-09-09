from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app.models import User, StyleProfile, WardrobeItem

from app.routes.users import router as user_router
from app.routes.style_profiles import router as style_profile_router
from app.routes.wardrobe import router as wardrobe_router
from app.routes.outfits import router as outfit_router
from app.routes.auth import router as auth_router
from app.routes.stylist import router as stylist_router
from fastapi.middleware.cors import CORSMiddleware


Base.metadata.create_all(bind=engine)

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


app = FastAPI(
    title="WearWise API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(style_profile_router)
app.include_router(wardrobe_router)
app.include_router(outfit_router)
app.include_router(stylist_router)


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