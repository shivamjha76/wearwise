from fastapi import APIRouter, Query
from typing import Optional
from app.services.weather import get_current_weather

router = APIRouter(
    prefix="/weather",
    tags=["Weather"]
)


@router.get("/current")
async def get_weather(
    lat: float = Query(..., description="Latitude coordinate"),
    lon: float = Query(..., description="Longitude coordinate"),
    city: Optional[str] = Query(None, description="Optional city name override")
):
    """
    Returns real-time weather data from Open-Meteo calibrated for WearWise outfit curation.
    """
    data = await get_current_weather(lat=lat, lon=lon, city=city)
    return data
