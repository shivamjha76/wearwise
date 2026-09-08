from fastapi import FastAPI

from app.database import Base, engine
from app.models import User, StyleProfile, WardrobeItem

from app.routes.users import router as user_router
from app.routes.style_profiles import router as style_profile_router
from app.routes.wardrobe import router as wardrobe_router
from app.routes.outfits import router as outfit_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="WearWise API",
    version="1.0.0"
)


app.include_router(user_router)
app.include_router(style_profile_router)
app.include_router(wardrobe_router)
app.include_router(outfit_router)


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