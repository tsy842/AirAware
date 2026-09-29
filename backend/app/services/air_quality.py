import httpx
from typing import Any, Dict

async def fetch_air_quality(lat: float, lon: float) -> Dict[str, Any]:
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,uv_index",
        "hourly": "pm10,pm2_5,european_aqi,us_aqi,ozone",
        "timezone": "auto",
        "forecast_days": 2
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(url, params=params)
        res.raise_for_status()
        data = res.json()

    current = data.get("current", {})
    hourly = data.get("hourly", {})

    return {
        "latitude": data.get("latitude", lat),
        "longitude": data.get("longitude", lon),
        "timezone": data.get("timezone", "UTC"),
        "source": "Open-Meteo Air Quality Atmospheric Chemistry Model (CAMS & SILAM)",
        "isModelEstimate": True,
        "disclaimer": "Air quality values are atmospheric model forecasts derived from CAMS and are not ground sensor measurements.",
        "lastUpdated": current.get("time"),
        "current": {
            "usAqi": int(round(current["us_aqi"])) if current.get("us_aqi") is not None else None,
            "europeanAqi": int(round(current["european_aqi"])) if current.get("european_aqi") is not None else None,
            "pm2_5": round(current["pm2_5"], 1) if current.get("pm2_5") is not None else None,
            "pm10": round(current["pm10"], 1) if current.get("pm10") is not None else None,
            "nitrogenDioxide": round(current["nitrogen_dioxide"], 1) if current.get("nitrogen_dioxide") is not None else None,
            "ozone": round(current["ozone"], 1) if current.get("ozone") is not None else None,
            "carbonMonoxide": round(current["carbon_monoxide"], 1) if current.get("carbon_monoxide") is not None else None,
            "sulphurDioxide": round(current["sulphur_dioxide"], 1) if current.get("sulphur_dioxide") is not None else None,
            "dust": round(current["dust"], 1) if current.get("dust") is not None else None,
            "uvIndex": round(current["uv_index"], 1) if current.get("uv_index") is not None else None,
        },
        "hourly": {
            "time": hourly.get("time", [])[:36],
            "pm2_5": hourly.get("pm2_5", [])[:36],
            "pm10": hourly.get("pm10", [])[:36],
            "usAqi": hourly.get("us_aqi", [])[:36],
            "europeanAqi": hourly.get("european_aqi", [])[:36],
            "ozone": hourly.get("ozone", [])[:36]
        }
    }
