from typing import Any, Dict

def calculate_heat_index(temp_c: float, rh: float) -> float:
    if temp_c < 27:
        return temp_c
    T = (temp_c * 9) / 5 + 32
    R = rh
    HI = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (R * 0.094))
    if HI > 80:
        HI = -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R \
             - 0.00683783 * T * T - 0.05481717 * R * R + 0.00122874 * T * T * R \
             + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R
    return round(((HI - 32) * 5) / 9, 1)

def evaluate_risk(air_data: Dict[str, Any], weather_data: Dict[str, Any]) -> Dict[str, Any]:
    current_air = air_data.get("current", {})
    current_weather = weather_data.get("current", {})

    pm25 = current_air.get("pm2_5")
    pm10 = current_air.get("pm10")
    us_aqi = current_air.get("usAqi") or (int(round(pm25 * 2.2)) if pm25 else 50)

    temp = current_weather.get("temperature", 25.0)
    humidity = current_weather.get("relativeHumidity", 50)
    wind_speed = current_weather.get("windSpeed", 10.0)
    precip = current_weather.get("precipitation", 0.0)

    heat_index = calculate_heat_index(temp, humidity)

    # Classify overall risk
    if us_aqi > 300 or heat_index > 50:
        overall_risk = "hazardous"
        score = 95
        color = "#7F1D1D"
        reason = "Extremely elevated hazardous air pollution and critical thermal load."
    elif us_aqi > 200 or heat_index > 40:
        overall_risk = "severe"
        score = 80
        color = "#8B5CF6"
        reason = "Very unhealthy air quality threshold reached; severe population-wide exposure."
    elif us_aqi > 150 or wind_speed > 45:
        overall_risk = "high"
        score = 65
        color = "#EF4444"
        reason = f"Elevated particulate concentration ({pm25} µg/m³) exceeding WHO safety baselines."
    elif us_aqi > 100 or temp > 35:
        overall_risk = "elevated"
        score = 48
        color = "#F59E0B"
        reason = "Atmospheric conditions entering sensitive group warning threshold."
    elif us_aqi > 50:
        overall_risk = "moderate"
        score = 32
        color = "#84CC16"
        reason = "Moderate air quality; acceptable for general healthy populace."
    else:
        overall_risk = "minimal"
        score = 15
        color = "#10B981"
        reason = "Clean environmental readings within WHO 24h targets."

    return {
        "overallRisk": overall_risk,
        "overallScore": score,
        "overallColor": color,
        "summaryTitle": f"Environmental Risk: {overall_risk.upper()}",
        "reasonForClassification": reason,
        "airQualityRisk": {
            "usAqi": us_aqi,
            "pm25": pm25,
            "pm10": pm10,
            "whoBenchmark": "WHO 24-hr PM2.5 guideline: 15 µg/m³"
        },
        "weatherRisk": {
            "temperature": temp,
            "heatIndex": heat_index,
            "windSpeed": wind_speed,
            "precipitation": precip
        },
        "activitySuitability": {
            "running": {"suitable": us_aqi <= 100 and heat_index < 38, "advice": "Avoid heavy cardio outdoors if AQI > 150"},
            "cycling": {"suitable": us_aqi <= 120 and wind_speed < 40, "advice": "N95 mask recommended during rush hour"},
            "ventilation": {"suitable": us_aqi <= 70, "advice": "Keep windows closed during high smog"}
        },
        "dataAttribution": {
            "airSource": air_data.get("source"),
            "weatherSource": weather_data.get("source"),
            "limitations": "Model-based estimation. Not a municipal regulatory ground sensor."
        }
    }
