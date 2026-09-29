import httpx
from typing import Any, Dict

def decode_wmo_weather(code: int) -> Dict[str, str]:
    mapping = {
        0: {"condition": "Clear Sky", "icon": "sun"},
        1: {"condition": "Mainly Clear", "icon": "sun-dim"},
        2: {"condition": "Partly Cloudy", "icon": "cloud-sun"},
        3: {"condition": "Overcast", "icon": "cloud"},
        45: {"condition": "Fog", "icon": "cloud-fog"},
        51: {"condition": "Drizzle", "icon": "cloud-drizzle"},
        61: {"condition": "Slight Rain", "icon": "cloud-rain"},
        63: {"condition": "Moderate Rain", "icon": "cloud-rain"},
        65: {"condition": "Heavy Rain", "icon": "cloud-lightning-rain"},
        71: {"condition": "Snow Fall", "icon": "snowflake"},
        80: {"condition": "Rain Showers", "icon": "cloud-rain"},
        95: {"condition": "Thunderstorm", "icon": "cloud-lightning"},
    }
    return mapping.get(code, {"condition": "Fair Weather", "icon": "cloud-sun"})

async def fetch_weather(lat: float, lon: float) -> Dict[str, Any]:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,is_day",
        "hourly": "temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset",
        "timezone": "auto",
        "forecast_days": 5
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(url, params=params)
        res.raise_for_status()
        data = res.json()

    current = data.get("current", {})
    daily = data.get("daily", {})
    hourly = data.get("hourly", {})

    code = current.get("weather_code", 0)
    weather_info = decode_wmo_weather(code)

    return {
        "latitude": data.get("latitude", lat),
        "longitude": data.get("longitude", lon),
        "timezone": data.get("timezone", "UTC"),
        "source": "Open-Meteo Global Weather Models (ECMWF & GFS)",
        "lastUpdated": current.get("time"),
        "current": {
            "temperature": round(current.get("temperature_2m", 0), 1),
            "apparentTemperature": round(current.get("apparent_temperature", current.get("temperature_2m", 0)), 1),
            "relativeHumidity": int(round(current.get("relative_humidity_2m", 0))),
            "windSpeed": round(current.get("wind_speed_10m", 0), 1),
            "windDirection": int(round(current.get("wind_direction_10m", 0))),
            "precipitation": round(current.get("precipitation", 0), 1),
            "weatherCode": code,
            "weatherCondition": weather_info["condition"],
            "weatherIcon": weather_info["icon"],
            "surfacePressure": round(current.get("surface_pressure", 1013), 1),
            "isDay": current.get("is_day") == 1
        },
        "daily": {
            "time": daily.get("time", []),
            "temperatureMax": daily.get("temperature_2m_max", []),
            "temperatureMin": daily.get("temperature_2m_min", []),
            "precipitationProbabilityMax": daily.get("precipitation_probability_max", []),
            "weatherCode": daily.get("weather_code", [])
        },
        "hourly": {
            "time": hourly.get("time", [])[:36],
            "temperature": hourly.get("temperature_2m", [])[:36],
            "relativeHumidity": hourly.get("relative_humidity_2m", [])[:36],
            "precipitationProbability": hourly.get("precipitation_probability", [])[:36],
            "windSpeed": hourly.get("wind_speed_10m", [])[:36]
        }
    }
