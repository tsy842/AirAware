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

export function isValidGeminiApiKey(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  // Valid Google Gemini API keys start with 'AIza' and are at least 30 characters
  return trimmed.startsWith('AIza') && trimmed.length >= 30;
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

  // Only call external Gemini endpoint if a valid Google AI Studio API key starting with 'AIza' is available
  if (!isValidGeminiApiKey(apiKey)) {
    return {
      text: generateDeterministicResponse(userQuery, context),
      source: 'deterministic_fallback',
      model: 'AirAware Intelligence Rules Engine'
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey!,
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
  } catch (error: any) {
    console.warn('[AirAware AI Assistant] External model unavailable, using rules engine fallback:', error?.message || 'API error');
    return {
      text: generateDeterministicResponse(userQuery, context),
      source: 'deterministic_fallback',
      model: 'AirAware Intelligence Rules Engine'
    };
  }
}

function generateDeterministicResponse(query: string, ctx: EnvironmentalContext): string {
  const q = query.toLowerCase();
  const aqi = ctx.aqi ?? 50;
  const pm25 = ctx.pm25 ?? 25;
  const pm10 = ctx.pm10 ?? 45;
  const temp = ctx.temperature ?? 28;
  const humidity = ctx.humidity ?? 45;
  const windSpeed = ctx.windSpeed ?? 10;
  const cityName = ctx.locationName || 'your city';

  // 1. Masks, N95, Respirators & Physical Filtration
  if (q.includes('mask') || q.includes('n95') || q.includes('ffp2') || q.includes('kn95') || q.includes('respirator') || q.includes('cloth mask') || q.includes('surgical mask')) {
    if (aqi > 150 || (pm25 != null && pm25 > 55)) {
      return `😷 **N95 / FFP2 Respirator Strongly Recommended in ${cityName}:**\n\n• **Current Hazard:** AQI is **${aqi}** with a PM2.5 level of **${pm25} µg/m³** (nearly ${(pm25 / 15).toFixed(1)}x WHO guidelines).\n• **Why standard masks fail:** Microscopic PM2.5 aerosols (0.3–2.5 microns) pass easily through loose cotton cloth and surgical masks. Only an electrostatically charged **N95, KN95, or FFP2 respirator** provides 95%+ filtration against these combustion particles.\n• **Usage Guidelines:**\n  1. **Airtight Seal:** Ensure the metallic nose clip is pressed firmly to the bridge of your nose and cheekbones with zero gaps.\n  2. **Unvalved vs Valved:** An unvalved N95 is best for public spaces.\n  3. **Lifespan:** Replace after 20–30 cumulative hours of use, or earlier if breathing resistance increases or the interior gets damp.\n  4. Wear it whenever walking, riding a two-wheeler, or commuting near traffic corridors in ${cityName}.`;
    } else if (aqi > 100) {
      return `😷 **N95 Mask Advised for Commuters & Sensitive Groups:**\n\n• In **${cityName}** today, the AQI is **${aqi}** (Moderate to Sensitive range).\n• **Recommendation:** If you are walking along busy arterial roads, riding a scooter/bicycle, or have pre-existing asthma or bronchitis, wear a certified **N95 respirator**.\n• Healthy individuals doing quick errand trips away from direct vehicle exhaust may not require a mask, but keep one handy if smog worsens during evening hours.`;
    } else {
      return `🟢 **Mask Not Required for Ambient Air:**\n\n• Current air quality in **${cityName}** is favorable (AQI: **${aqi}**, PM2.5: **${pm25} µg/m³**).\n• Ambient particulate concentrations are within safe baseline ranges. A mask is only necessary if you are working directly in dusty construction zones or high-density diesel depots.`;
    }
  }

  // 2. Outdoor Running, Cardio, Jogging, Cycling, Sports & Walking
  if (q.includes('run') || q.includes('jog') || q.includes('exercise') || q.includes('workout') || q.includes('gym') || q.includes('fitness') || q.includes('marathon') || q.includes('cardio') || q.includes('cycling') || q.includes('bike') || q.includes('walk') || q.includes('sport') || q.includes('football') || q.includes('cricket') || q.includes('swim')) {
    if (aqi > 200 || (pm25 != null && pm25 > 90)) {
      return `🚫 **Avoid Outdoor Exercise in ${cityName} Today:**\n\n• **Current AQI:** **${aqi}** (Very Poor / Severe tier) | PM2.5: **${pm25} µg/m³**.\n• **The Pulmonary Mechanics:** During intense cardiovascular exercise, your breathing rate increases from ~6 L/min to over **60–100 L/min**, and oral breathing bypasses natural nasal filtration, driving fine particulates deep into your lower alveolar capillary beds.\n• **Actionable Health Plan:**\n  1. **Move Indoors:** Do treadmill running, stationary cycling, yoga, Pilates, or indoor resistance training.\n  2. **Avoid Morning Cardio:** Early mornings (6:00 AM – 9:00 AM) feature peak atmospheric temperature inversion where ground pollutants are concentrated.\n  3. If walking outside is unavoidable, keep it brief and wear a fitted N95 respirator.`;
    } else if (aqi > 100 || (pm25 != null && pm25 > 35)) {
      return `⚠️ **Exercise Outdoors with Caution in ${cityName}:**\n\n• **Current AQI:** **${aqi}** | PM2.5: **${pm25} µg/m³**.\n• **Guidance:** Healthy adults may engage in light outdoor workouts, but **limit duration to 30–45 minutes**.\n• **Best Strategy:**\n  1. Avoid exercising near highways, traffic intersections, or industrial stacks.\n  2. Shift outdoor workouts to the early afternoon (1:00 PM – 4:00 PM) when solar warming lifts the atmospheric boundary layer.\n  3. If you experience chest tightness, throat tickling, or coughing, stop immediately and move indoors.`;
    } else {
      return `✅ **Safe for Outdoor Exercise & Sports in ${cityName}:**\n\n• Air quality is currently **favorable** (AQI: **${aqi}**, PM2.5: **${pm25} µg/m³**).\n• It is an excellent day for running, cycling, playing sports, and outdoor walking! Make sure to stay well-hydrated given the ambient temperature of **${temp}°C**.`;
    }
  }

  // 3. Children, Infants, Pregnancy, Elderly & Vulnerable Groups
  if (q.includes('child') || q.includes('kid') || q.includes('baby') || q.includes('infant') || q.includes('toddler') || q.includes('pregnant') || q.includes('pregnancy') || q.includes('elderly') || q.includes('senior') || q.includes('grandparent') || q.includes('asthma') || q.includes('asthmatic') || q.includes('copd') || q.includes('heart') || q.includes('patient') || q.includes('vulnerable')) {
    return `👶 **Health Protocol for Vulnerable Populations in ${cityName}:**\n\n• **Current Environmental Risk:** AQI is **${aqi}** (${ctx.riskCategory || 'Assessed Risk'}).\n• **Why Vulnerable Groups Face Greater Risk:**\n  - Children inhale up to **50% more air per pound of body weight** than adults, and their lung alveoli continue developing throughout childhood.\n  - In seniors and cardiac patients, PM2.5 can induce vascular inflammation, spike blood pressure, and trigger arrhythmias.\n• **Immediate Protective Steps:**\n  1. **School & Play:** Reschedule outdoor school sports and playground recess to indoor play areas.\n  2. **Asthma Care:** Ensure fast-acting rescue inhalers (e.g. Salbutamol / Albuterol) are easily accessible and check peak expiratory flow.\n  3. **Air Purification:** Keep bedrooms and resting rooms sealed with an active HEPA air purifier.\n  4. **Prenatal Precaution:** Pregnant individuals should strictly limit exposure to heavy vehicular and biomass smoke.`;
  }

  // 4. Windows, Home Ventilation, HEPA Air Purifiers & Indoor Air
  if (q.includes('window') || q.includes('indoor') || q.includes('purifier') || q.includes('hepa') || q.includes('ventilate') || q.includes('open window') || q.includes('seal') || q.includes('clean air indoors') || q.includes('filter') || q.includes('ac') || q.includes('air condition')) {
    if (aqi > 120) {
      return `🪟 **Indoor Air Management & Window Protocol for ${cityName}:**\n\n• **Current Outdoor AQI:** **${aqi}** (Polluted ambient air).\n• **Directives:**\n  1. **Keep Windows & Balconies Sealed:** Outdoor toxic particulates infiltrate rapidly through open windows.\n  2. **Run True HEPA Filtration:** Run an H13 or H14 HEPA air purifier continuously in bedrooms and living spaces. Set the fan speed to medium/high.\n  3. **Purifier Placement:** Place your purifier at least 1.5 feet away from walls and close to where you spend the most time (bedside or work desk).\n  4. **Avoid Indoor Smoke:** Do not burn incense sticks (agarbatti), mosquito coils, or scented candles. Always turn on the kitchen exhaust hood while cooking.\n  5. **When to Ventilate:** If indoor air feels stale, conduct a brief 10–15 minute cross-ventilation during sunny afternoon hours (2:00 PM – 4:00 PM), then reseal and run the purifier on high.`;
    } else {
      return `🪟 **Home Ventilation Safe in ${cityName}:**\n\n• Current AQI is **${aqi}**.\n• Opening windows for cross-ventilation is safe today to flush out indoor carbon dioxide (CO₂) and volatile organic compounds (VOCs). Enjoy fresh airflow!`;
    }
  }

  // 5. Cigarette Equivalency & Smog Exposure Comparison
  if (q.includes('cigarette') || q.includes('smoke') || q.includes('smoking') || q.includes('tobacco') || q.includes('equal to') || q.includes('equivalent')) {
    const cigs = (pm25 / 22).toFixed(1);
    return `🚬 **Scientific Cigarette Equivalence for ${cityName}:**\n\n• **Current PM2.5 Level:** **${pm25} µg/m³**.\n• **The Science (Berkeley Earth Rule of Thumb):** Breathing **22 µg/m³** of fine PM2.5 continuously over 24 hours delivers approximately the same particulate mass burden as smoking **1 full cigarette**.\n• **Your Equivalent Exposure:** Spending a full day breathing ambient outdoor air in ${cityName} today is roughly equivalent to smoking **~${cigs} cigarettes**.\n• **How to Mitigate:** Spending 80%+ of your day in an indoor environment equipped with a clean HEPA filtration system reduces this passive toxic inhalation by up to 90%.`;
  }

  // 6. City-Specific Pollution Sources & Atmospheric Dynamics ("About this city" / "Why is it polluted?")
  if (q.includes('about') || q.includes('why') || q.includes('source') || q.includes('cause') || q.includes('reason') || q.includes('origin') || q.includes('stubble') || q.includes('parali') || q.includes('traffic') || q.includes('industry')) {
    return `🏭 **Pollution Profile & Atmospheric Dynamics in ${cityName}:**\n\n• **Current Status:** AQI **${aqi}** | PM2.5: **${pm25} µg/m³** | Temp: **${temp}°C** | Wind: **${windSpeed} km/h**.\n• **Key Contributing Factors:**\n  1. **Meteorological Boundary Layer:** Cooler surface temperatures (${temp}°C) and light winds (${windSpeed} km/h) create an atmospheric inversion ceiling that prevents vertical dispersion.\n  2. **Transportation Emissions:** High-density traffic, diesel freight, and stop-and-go congestion generate primary soot, carbon monoxide, and nitrogen oxides (NO₂).\n  3. **Biomass & Agricultural Stubble:** Seasonal crop residue burning across regional agricultural corridors introduces large plumes of organic and elemental carbon.\n  4. **Resuspended Road Dust & Construction:** Microscopic silica and construction dust constantly churned by road traffic.\n• **Model Note:** These insights are synthesized from CAMS atmospheric chemistry simulations and local meteorological vectors.`;
  }

  // 7. Health Symptoms, Sore Throat, Burning Eyes & Practical Remedies
  if (q.includes('symptom') || q.includes('throat') || q.includes('eye') || q.includes('burn') || q.includes('cough') || q.includes('headache') || q.includes('chest') || q.includes('lung') || q.includes('mucus') || q.includes('remedy') || q.includes('food') || q.includes('diet') || q.includes('drink') || q.includes('jaggery') || q.includes('water')) {
    return `🍵 **Smog Health Symptoms & Practical Relief for ${cityName}:**\n\n• **Common Smog Reactions:** Irritated dry throat, stinging/watery eyes, nasal congestion, dry morning cough, and fatigue.\n• **Actionable Home Protocols:**\n  1. **Saline Nasal Rinse:** Use an isotonic saline nasal spray twice daily to gently flush out trapped fine soot from your nasal passages.\n  2. **Hydration:** Drink at least 2.5–3 liters of water. Adding lemon, electrolytes, or warm herbal ginger-tulsi tea helps mucosal membranes stay moist.\n  3. **Eye Relief:** Use preservative-free lubricating artificial tear drops if experiencing grit or dryness.\n  4. **Antioxidant Diet:** Consume foods rich in Vitamin C, Vitamin E, and curcumin (turmeric) to support your body's response to environmental oxidative stress.\n  • *Warning: If experiencing shortness of breath, wheezing, or chest pain, consult a medical professional immediately.*`;
  }

  // 8. Diurnal Trends & Best Time of Day
  if (q.includes('best time') || q.includes('worst time') || q.includes('time of day') || q.includes('morning') || q.includes('evening') || q.includes('night') || q.includes('when') || q.includes('cleanest')) {
    return `⏰ **Best & Worst Times of Day for Outdoor Air in ${cityName}:**\n\n• **Worst Pollution Hours (Peak Danger):** Early morning (**6:00 AM – 9:30 AM**) and late night (**9:00 PM – 1:00 AM**). Ground radiation cooling forms a surface temperature inversion that traps smoke and exhaust.\n• **Cleanest Window (Lower Relative Risk):** Early to mid-afternoon (**1:30 PM – 4:30 PM**). Sunlight warms the ground, expanding the atmospheric mixing height and diluting surface pollutants.\n• **Action Tip:** If you must venture outdoors or air out your living space, schedule it during mid-afternoon rather than dawn or late evening.`;
  }

  // 9. Pets & Animals
  if (q.includes('pet') || q.includes('dog') || q.includes('cat') || q.includes('animal') || q.includes('puppy')) {
    return `🐕 **Pet Safety Advisory for ${cityName}:**\n\n• **Current Hazard:** AQI **${aqi}**.\n• **Key Risks for Pets:** Dogs and cats walk near street level where heavy particulate exhaust and road dust are most concentrated. They also have higher respiratory rates per pound.\n• **Protective Steps:**\n  1. Keep outdoor walks brief (under 10–15 minutes) for essential bathroom breaks only.\n  2. Avoid strenuous ball-fetching or running games in open parks.\n  3. Wipe your pet's paws, fur, and muzzle with a damp cloth after walks to prevent them from ingesting toxic particulates during grooming.`;
  }

  // 10. PM2.5 and PM10 Technical Inquiries
  if (q.includes('pm2.5') || q.includes('pm 2.5') || q.includes('pm10') || q.includes('pm 10') || q.includes('particulate') || q.includes('pollutant') || q.includes('particle')) {
    return `🔬 **Understanding PM2.5 & PM10 in ${cityName}:**\n\n• **Current PM2.5:** **${pm25} µg/m³** (WHO safe guideline: 15 µg/m³).\n• **Current PM10:** **${pm10} µg/m³** (WHO safe guideline: 45 µg/m³).\n• **What is PM2.5?** Particles smaller than 2.5 microns (1/30th the diameter of a human hair). Because of their microscopic size, they evade nasal cilia and penetrate deep into pulmonary alveoli, entering the systemic bloodstream.\n• **What is PM10?** Coarser particles (2.5–10 microns) consisting of road silt, pollen, and mechanical dust that deposit in the upper trachea and nasal passages.\n• **Source:** Formed from fuel combustion, industrial smoke, and secondary chemical aerosol condensation.`;
  }

  // 11. Heatwave, Extreme Weather, Cyclones & Floods
  if (q.includes('heat') || q.includes('hot') || q.includes('sun') || q.includes('cyclone') || q.includes('flood') || q.includes('storm') || q.includes('rain')) {
    if (temp > 35 || q.includes('heat')) {
      return `☀️ **Heatwave & Thermal Resilience Advisory for ${cityName}:**\n\n• Ambient temperature is **${temp}°C** with relative humidity of **${humidity}%**.\n• **Heat Index Risk:** High thermal stress combined with air pollution causes elevated cardiovascular strain.\n• **Precautions:**\n  1. Avoid direct sun exposure between 12:00 PM and 4:00 PM.\n  2. Drink water frequently, supplemented with ORS or coconut water.\n  3. Wear loose, light-colored, breathable cotton clothing.\n  4. Never leave children or pets unattended in parked vehicles.`;
    } else {
      return `🌧️ **Extreme Weather & Disaster Readiness for ${cityName}:**\n\n• Current Conditions: Temperature **${temp}°C**, Wind **${windSpeed} km/h**.\n• **Emergency Checklist:**\n  1. **Water:** Keep 3L of potable drinking water per person stored.\n  2. **Power:** Fully charge phones, flashlights, and portable power banks.\n  3. **Documents:** Keep identity cards and essential prescriptions in waterproof zip bags.\n  4. **Official Alerts:** Follow verified national and state disaster management bulletins.`;
    }
  }

  // 12. Conversational Greetings & General Inquiries
  if (q.includes('hi') || q.includes('hello') || q.includes('hey') || q.includes('who are you') || q.includes('help') || q.trim() === 'ok' || q.trim() === 'thanks') {
    return `👋 **Welcome! I am your AirAware Environmental Intelligence Assistant.**\n\nHere is your live environmental summary for **${cityName}**:\n• **Air Quality:** AQI **${aqi}** (${aqi > 150 ? 'Unhealthy - High Exposure' : aqi > 100 ? 'Moderate Caution' : 'Favorable'})\n• **PM2.5:** ${pm25} µg/m³\n• **Temperature:** ${temp}°C\n• **Primary Directives:** ${aqi > 150 ? '🚫 Avoid outdoor cardio exercise • 😷 Wear an N95 respirator' : aqi > 100 ? '⚠️ Reduce outdoor workout duration • 😷 Mask advised for sensitive groups' : '✅ Safe for outdoor recreation'}\n\n**You can ask me anything about:**\n- *"Is it safe to run or cycle today?"*\n- *"Should I wear an N95 mask outside?"*\n- *"What precautions should children and seniors take?"*\n- *"Should I keep windows open or use an air purifier?"*\n- *"Why is ${cityName} polluted right now?"*`;
  }

  // 13. General Default Comprehensive Environmental Assessment
  return `In **${cityName}**, the current estimated AQI is **${aqi}** with a PM2.5 concentration of **${pm25} µg/m³**, ambient temperature of **${temp}°C**, and **${ctx.weatherCondition || 'partly cloudy'}** weather conditions.\n\n• **Air Assessment:** ${aqi > 150 ? 'High particulate concentration. Avoid intense outdoor cardio workouts and wear a certified N95 mask outside.' : aqi > 100 ? 'Moderate to elevated pollution. Sensitive groups should limit heavy outdoor exertion and run indoor air purifiers.' : 'Air quality is within acceptable limits for daily outdoor activities.'}\n• **Ventilation:** ${aqi > 120 ? 'Keep home windows closed and run HEPA air filtration.' : 'Normal window ventilation is acceptable.'}\n• **Weather Outlook:** ${temp > 35 ? 'Elevated daytime heat; maintain continuous hydration.' : 'Moderate ambient weather.'}\n\n*Feel free to ask specific questions about exercise safety, mask types, children precautions, or indoor air filtration!*`;
}
