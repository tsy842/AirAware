from typing import Any, Dict, Optional
from backend.app.core.config import settings

async def generate_ai_advice(question: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
    ctx = context or {}
    loc_name = ctx.get("locationName", "Your Location")
    aqi = ctx.get("aqi", 50)
    pm25 = ctx.get("pm25", 25)
    temp = ctx.get("temperature", 28)

    # If Gemini API key is configured and available in Python environment
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "MY_GEMINI_API_KEY":
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            prompt = f"""
            Location: {loc_name}
            Air Quality (AQI): {aqi}
            PM2.5: {pm25} µg/m³
            Temperature: {temp}°C
            User Question: {question}

            Provide a clear, grounded climate and air health explanation.
            """
            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=prompt
            )
            if response and response.text:
                return {
                    "text": response.text,
                    "source": "gemini",
                    "model": "gemini-3.8-flash"
                }
        except Exception as e:
            pass

    # Deterministic rule-based fallback
    q = question.lower()
    if "run" in q or "exercise" in q or "jog" in q:
        if aqi > 150:
            text = f"In {loc_name}, with AQI at {aqi} and PM2.5 at {pm25} µg/m³, outdoor running is not advised. High ventilation rates drive fine particulate matter deep into the lungs. Exercise indoors today."
        elif aqi > 100:
            text = f"AQI in {loc_name} is {aqi} (Sensitive). Keep outdoor runs light and under 30 minutes, or exercise indoors if you have asthma."
        else:
            text = f"Conditions in {loc_name} are favorable for outdoor running with an AQI of {aqi}. Stay hydrated and enjoy your workout!"
    elif "pm2.5" in q:
        text = f"PM2.5 in {loc_name} is {pm25} µg/m³ (WHO 24h limit is 15 µg/m³). These fine combustion particles penetrate alveolar tissues and enter the bloodstream, causing systemic inflammation."
    elif "heat" in q or "temp" in q:
        text = f"Current temperature is {temp}°C in {loc_name}. Stay hydrated with electrolytes and avoid direct midday solar exposure between 12 PM and 4 PM."
    else:
        text = f"Environmental assessment for {loc_name}: Estimated AQI is {aqi} with PM2.5 at {pm25} µg/m³ and ambient temperature {temp}°C. AirAware recommends checking localized forecasts before scheduling prolonged outdoor activities."

    return {
        "text": text,
        "source": "deterministic_fallback",
        "model": "AirAware Rules Engine Fallback"
    }
