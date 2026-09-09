import httpx
from typing import Optional


WMO_WEATHER_MAP = {
    0: ("Clear sky", "☀️"),
    1: ("Mainly clear", "🌤️"),
    2: ("Partly cloudy", "⛅"),
    3: ("Overcast", "☁️"),
    45: ("Fog", "🌫️"),
    48: ("Depositing rime fog", "🌫️"),
    51: ("Light drizzle", "🌦️"),
    53: ("Moderate drizzle", "🌦️"),
    55: ("Dense drizzle", "🌧️"),
    56: ("Light freezing drizzle", "🌧️"),
    57: ("Dense freezing drizzle", "🌧️"),
    61: ("Slight rain", "🌧️"),
    63: ("Moderate rain", "🌧️"),
    65: ("Heavy rain", "🌧️"),
    66: ("Light freezing rain", "🌧️"),
    67: ("Heavy freezing rain", "🌧️"),
    71: ("Slight snow fall", "❄️"),
    73: ("Moderate snow fall", "❄️"),
    75: ("Heavy snow fall", "❄️"),
    77: ("Snow grains", "❄️"),
    80: ("Slight rain showers", "🌦️"),
    81: ("Moderate rain showers", "🌧️"),
    82: ("Violent rain showers", "⛈️"),
    85: ("Slight snow showers", "🌨️"),
    86: ("Heavy snow showers", "🌨️"),
    95: ("Thunderstorm", "⛈️"),
    96: ("Thunderstorm with slight hail", "⛈️"),
    99: ("Thunderstorm with heavy hail", "⛈️"),
}


def classify_weather(temp_celsius: float, weather_code: int) -> dict:
    """
    Classifies raw weather data into WearWise's outfit context:
    - category: "warm" | "cool" | "cold"
    - condition: human-readable label
    - icon: emoji icon
    - tip: actionable styling advisory
    """
    condition, icon = WMO_WEATHER_MAP.get(weather_code, ("Clear", "☀️"))

    is_rainy = weather_code in [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]
    is_snowy = weather_code in [71, 73, 75, 77, 85, 86]

    if temp_celsius >= 22.0:
        category = "warm"
        tip = "Warm weather: lightweight breathable tops (cotton, linen) and relaxed fits are ideal."
    elif temp_celsius >= 14.0:
        category = "cool"
        tip = "Mild/cool weather: versatile transitional layers (overshirt, knit polo, chinos) work best."
    else:
        category = "cold"
        tip = "Cold weather: structured insulation (jackets, sweaters, heavier trousers) keeps your silhouette warm."

    if is_rainy:
        tip += " 🌧️ Rain expected: choose water-resistant footwear and avoid pristine white shoes."
    elif is_snowy:
        tip += " ❄️ Snow conditions: pair sturdy boots and structured heavy outerwear."

    return {
        "category": category,
        "condition": condition,
        "icon": icon,
        "styling_tip": tip,
        "is_precipitation": is_rainy or is_snowy,
    }


async def fetch_city_name(lat: float, lon: float) -> Optional[str]:
    """Reverse-geocodes coordinates into an informal city/area name."""
    try:
        url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=en"
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                city = data.get("city") or data.get("locality") or data.get("principalSubdivision")
                country = data.get("countryCode")
                if city and country:
                    return f"{city}, {country}"
                return city
    except Exception:
        pass
    return None


async def get_current_weather(lat: float, lon: float, city: Optional[str] = None) -> dict:
    """
    Fetches real-time weather from Open-Meteo for the given latitude and longitude.
    Falls back gracefully if the external API is unreachable.
    """
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m"
        f"&timezone=auto"
    )

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                payload = resp.json()
                current = payload.get("current", {})
                temp = float(current.get("temperature_2m", 20.0))
                apparent_temp = float(current.get("apparent_temperature", temp))
                weather_code = int(current.get("weather_code", 0))
                humidity = int(current.get("relative_humidity_2m", 50))
                wind_speed = float(current.get("wind_speed_10m", 0.0))

                classification = classify_weather(temp, weather_code)

                resolved_city = city or await fetch_city_name(lat, lon) or "Local Weather"

                return {
                    "status": "success",
                    "temperature": round(temp, 1),
                    "apparent_temperature": round(apparent_temp, 1),
                    "weather_category": classification["category"],
                    "condition": classification["condition"],
                    "icon": classification["icon"],
                    "styling_tip": classification["styling_tip"],
                    "humidity": humidity,
                    "wind_speed": wind_speed,
                    "city": resolved_city,
                    "is_precipitation": classification["is_precipitation"],
                    "latitude": lat,
                    "longitude": lon,
                }
    except Exception as exc:
        print(f"Weather fetch failed for ({lat}, {lon}): {exc}")

    # Graceful offline/error fallback
    return {
        "status": "fallback",
        "temperature": 21.0,
        "apparent_temperature": 21.0,
        "weather_category": "cool",
        "condition": "Mild",
        "icon": "🌤️",
        "styling_tip": "Mild weather: versatile transitional pieces (polos, shirts, denim) recommended.",
        "humidity": 50,
        "wind_speed": 5.0,
        "city": city or "Current Location",
        "is_precipitation": False,
        "latitude": lat,
        "longitude": lon,
    }
