from typing import Any, List, Dict
from datetime import datetime, timezone, timedelta

def get_alerts() -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    return [
        {
            "id": "imd_heatwave_north_2026",
            "type": "heatwave",
            "classification": "OFFICIAL_GOVERNMENT_WARNING",
            "title": "IMD Severe Heatwave & High Radiation Alert (Orange Warning)",
            "severity": "severe",
            "affectedRegions": ["Haryana", "Delhi NCR", "Rajasthan", "Uttar Pradesh", "Gurugram"],
            "headline": "Daytime temperatures reaching 42°C–45°C with severe heat radiation and photochemical ozone.",
            "source": "India Meteorological Department (IMD National Weather Bulletin)",
            "sourceUrl": "https://mausam.imd.gov.in",
            "issuedAt": (now - timedelta(hours=4)).isoformat(),
            "actions": [
                "Avoid prolonged outdoor sun exposure between 12:00 PM and 4:00 PM",
                "Drink oral rehydration solution (ORS) or lemon water frequently",
                "Ensure shaded resting shelters for outdoor personnel"
            ]
        },
        {
            "id": "imd_air_dispersion_advisory",
            "type": "air_quality_emergency",
            "classification": "FORECAST_RISK_ESTIMATE",
            "title": "Regional Atmospheric Inversion & Dispersion Advisory",
            "severity": "moderate",
            "affectedRegions": ["Indo-Gangetic Plain", "Delhi NCR", "Gurugram"],
            "headline": "Low wind velocities (<8 km/h) trapping PM2.5 in shallow atmospheric mixing layer.",
            "source": "AirAware Environmental Risk Model & CAMS Atmospheric Forecast",
            "sourceUrl": "https://air-quality-api.open-meteo.com",
            "issuedAt": (now - timedelta(hours=10)).isoformat(),
            "actions": [
                "Sensitive individuals should operate indoor HEPA purifiers",
                "Avoid heavy outdoor cardio before 9:00 AM",
                "Wear certified N95 respirators in high-traffic corridors"
            ]
        }
    ]
