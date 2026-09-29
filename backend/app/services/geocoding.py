import httpx
from typing import Any, List, Dict

async def search_locations(query: str, count: int = 8) -> List[Dict[str, Any]]:
    if not query or len(query.strip()) < 2:
        return []

    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {
        "name": query.strip(),
        "count": count,
        "language": "en",
        "format": "json"
    }

    async with httpx.AsyncClient(timeout=8.0) as client:
        res = await client.get(url, params=params)
        res.raise_for_status()
        data = res.json()

    results = data.get("results", [])
    return [
        {
            "id": r.get("id"),
            "name": r.get("name"),
            "latitude": r.get("latitude"),
            "longitude": r.get("longitude"),
            "country": r.get("country"),
            "countryCode": r.get("country_code"),
            "admin1": r.get("admin1"),
            "admin2": r.get("admin2"),
            "timezone": r.get("timezone"),
            "population": r.get("population")
        }
        for r in results
    ]
