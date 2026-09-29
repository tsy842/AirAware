import { GoogleGenAI } from '@google/genai';

interface EnvironmentalContext {
  locationName: string;
  latitude: number;
  longitude: number;
  aqi?: number | null;
  pm25?: number | null;
  pm10?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  windSpeed?: number | null;
  weatherCondition?: string;
  alerts?: string[];
  riskCategory?: string;
}

export async function askEnvironmentalAssistant(
  userQuery: string,
  context: EnvironmentalContext,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
): Promise<{ text: string; source: 'gemini' | 'deterministic_fallback'; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Prepare clear, grounded context
  const contextSummary = `
Location: ${context.locationName} (${context.latitude.toFixed(3)}°N, ${context.longitude.toFixed(3)}°E)
Current Air Quality (US AQI): ${context.aqi ?? 'Unavailable'}
PM2.5: ${context.pm25 != null ? `${context.pm25} µg/m³` : 'Unavailable'}
PM10: ${context.pm10 != null ? `${context.pm10} µg/m³` : 'Unavailable'}
Temperature: ${context.temperature != null ? `${context.temperature}°C` : 'Unavailable'}
Relative Humidity: ${context.humidity != null ? `${context.humidity}%` : 'Unavailable'}
Wind Speed: ${context.windSpeed != null ? `${context.windSpeed} km/h` : 'Unavailable'}
Weather: ${context.weatherCondition || 'Normal'}
Risk Classification: ${context.riskCategory || 'Assessed by AirAware'}
Active Official Warnings/Bulletins: ${context.alerts && context.alerts.length > 0 ? context.alerts.join('; ') : 'None active'}
Data Source: Atmospheric model forecasts from Open-Meteo (CAMS & ECMWF). Note: Not regulatory ground monitor readings.
`;

  const systemInstruction = `
You are the AirAware Environmental Intelligence Assistant, an expert in clean air science, environmental health, and climate resilience.

GUIDELINES:
1. Explain air quality and weather risks in simple, actionable, and empathetic language.
2. Ground your answer in the provided environmental context.
3. Be clear about uncertainty: Open-Meteo data is based on atmospheric modeling, not ground monitoring stations.
4. Avoid definitive medical diagnoses or individual medical advice; refer users to medical professionals for specific clinical conditions.
5. If extreme weather (heatwaves, cyclones, severe floods) or hazardous AQI is reported, provide practical, official safety recommendations (like WHO or IMD guidelines).
6. Keep answers concise, readable, and structured with bullet points where appropriate.
7. NEVER invent sensor stations, fake historical data, or unverified disaster declarations.
`;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return {
      text: generateDeterministicResponse(userQuery, context),
      source: 'deterministic_fallback',
      model: 'AirAware Rules Engine Fallback'
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const prompt = `
CURRENT ENVIRONMENTAL CONTEXT:
${contextSummary}

USER QUESTION:
"${userQuery}"

Provide a clear, helpful response explaining what this means for their day-to-day safety, health, outdoor activities, or climate resilience.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 800
      }
    });

    const text = response.text || generateDeterministicResponse(userQuery, context);

    return {
      text,
      source: 'gemini',
      model: 'gemini-3.8-flash'
    };
  } catch (error) {
    console.error('Gemini API call failed or key quota reached:', error);
    return {
      text: generateDeterministicResponse(userQuery, context),
      source: 'deterministic_fallback',
      model: 'AirAware Rules Engine Fallback'
    };
  }
}

function generateDeterministicResponse(query: string, ctx: EnvironmentalContext): string {
  const q = query.toLowerCase();
  const aqi = ctx.aqi ?? 50;
  const pm25 = ctx.pm25 ?? 25;
  const temp = ctx.temperature ?? 28;

  if (q.includes('run') || q.includes('exercise') || q.includes('workout') || q.includes('outside')) {
    if (aqi > 150 || (ctx.pm25 != null && ctx.pm25 > 55)) {
      return `Based on the current AQI of ${aqi} (PM2.5: ${pm25} µg/m³) in ${ctx.locationName}, outdoor running is **not advised**. High-intensity cardio elevates breathing rates 10-fold, pulling fine particulates deep into your lower airways and circulatory system. **Recommendation:** Switch to indoor treadmill, yoga, or indoor strength training today. If you must be outside, wear a certified N95 respirator.`;
    } else if (aqi > 100) {
      return `Air quality in ${ctx.locationName} is currently in the **Sensitive / Moderate-High zone** (AQI: ${aqi}). Healthy individuals can engage in light jogging, but consider shortening your workout to under 30 minutes. If you have asthma, allergies, or cardiovascular sensitivities, exercise indoors.`;
    } else {
      return `Air quality in ${ctx.locationName} is currently **favorable** (AQI: ${aqi}). Outdoor running and recreation are generally safe! Keep hydrated and monitor temperature (${temp}°C) to prevent thermal fatigue.`;
    }
  }

  if (q.includes('pm2.5') || q.includes('pm 2.5') || q.includes('particulate')) {
    return `**Understanding PM2.5 in ${ctx.locationName}:**\n\n• **Current reading:** ${pm25} µg/m³ (WHO 24-hour guideline is 15 µg/m³).\n• **What it is:** Particulate Matter 2.5 refers to microscopic combustion particles, vehicle exhaust, and chemical aerosols smaller than 2.5 micrometers—about 1/30th the width of a human hair.\n• **Why it matters:** Unlike larger dust particles captured by nasal hairs, PM2.5 penetrates into the pulmonary alveoli and can enter the bloodstream, aggravating asthma, respiratory symptoms, and long-term cardiovascular health.\n• **Data note:** This reading is modeled using CAMS atmospheric chemistry simulations.`;
  }

  if (q.includes('heat') || q.includes('temperature') || q.includes('hot')) {
    return `**Heat & Weather Advisory for ${ctx.locationName}:**\n\n• Current ambient temperature is **${temp}°C** with **${ctx.humidity ?? 40}%** relative humidity.\n• **Precautions:**\n  1. Avoid direct sunlight during peak ultraviolet and heat hours (12:00 PM – 4:00 PM).\n  2. Drink water frequently, supplemented with ORS or electrolytes.\n  3. Never leave children or pets in parked vehicles.\n  4. Wear loose, light-colored breathable fabrics.`;
  }

  if (q.includes('cyclone') || q.includes('flood') || q.includes('storm')) {
    return `**Emergency Preparedness Checklist for Extreme Weather:**\n\n1. **Drinking Water:** Store at least 3 liters of potable drinking water per person per day for at least 3 days.\n2. **Emergency Lighting & Power:** Charge power banks, flashlights, and keep spare AA/AAA batteries ready.\n3. **Important Documents:** Store identification, insurance policies, and prescriptions in a sealed waterproof pouch.\n4. **Communication:** Keep an emergency radio or battery-operated phone charged to follow local disaster management (NDMA / IMD) bulletins.`;
  }

  return `In **${ctx.locationName}**, the current estimated AQI is **${aqi}** with a PM2.5 concentration of **${pm25} µg/m³**, ambient temperature of **${temp}°C**, and **${ctx.weatherCondition || 'partly cloudy'}** weather conditions.\n\n• **Air Assessment:** ${aqi > 100 ? 'Pollution is elevated. Sensitive groups should limit heavy outdoor exertion and use indoor air purifiers.' : 'Air quality is within acceptable limits for general daily routines.'}\n• **Weather Outlook:** ${temp > 35 ? 'High daytime heat; ensure regular hydration.' : 'Mild weather.'}\n• *Note: Values are calculated from atmospheric models and numerical forecasts.*`;
}
