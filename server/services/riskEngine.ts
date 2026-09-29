import { NormalizedAirQuality } from './airQuality';
import { NormalizedWeather } from './weather';

export type RiskLevel = 'minimal' | 'moderate' | 'elevated' | 'high' | 'severe' | 'hazardous';

export interface ActivitySuitability {
  running: { suitable: boolean; advice: string; rating: 'good' | 'caution' | 'avoid' };
  cycling: { suitable: boolean; advice: string; rating: 'good' | 'caution' | 'avoid' };
  childrenElderly: { suitable: boolean; advice: string; rating: 'good' | 'caution' | 'avoid' };
  ventilation: { suitable: boolean; advice: string; rating: 'open' | 'limited' | 'closed' };
  maskRecommendation: { recommended: boolean; maskType: string; reason: string };
}

export interface RiskIntelligenceReport {
  overallRisk: RiskLevel;
  overallScore: number; // 0-100 normalized index for quick visual gauge
  overallColor: string; // Tailwind hex or class
  summaryTitle: string;
  reasonForClassification: string;
  supportingMeasurements: {
    label: string;
    value: string;
    unit?: string;
    status: 'optimal' | 'moderate' | 'unfavorable' | 'hazardous';
    benchmark: string;
  }[];
  airQualityRisk: {
    category: string;
    indexStandard: string;
    primaryPollutant: string;
    pm25VsWhoGuideline: string;
    pm10VsWhoGuideline: string;
    healthImplications: string;
    precautions: string[];
  };
  weatherRisk: {
    category: string;
    heatIndexCelsius: number | null;
    heatRiskLevel: 'none' | 'caution' | 'extreme_caution' | 'danger' | 'extreme_danger';
    windCondition: string;
    precipitationRisk: string;
    comfortSummary: string;
  };
  activitySuitability: ActivitySuitability;
  climateResilienceAdvice: {
    title: string;
    bulletPoints: string[];
  };
  dataAttribution: {
    airQualitySource: string;
    weatherSource: string;
    lastUpdated: string;
    limitations: string;
  };
}

// Compute Heat Index (Rothfusz equation in Celsius)
function calculateHeatIndex(tempC: number, rh: number): number {
  if (tempC < 27) return tempC;
  // Convert to Fahrenheit for standard NOAA equation
  const T = (tempC * 9) / 5 + 32;
  const R = rh;

  let HI = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (R * 0.094));
  if (HI > 80) {
    HI = -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R
      - 0.00683783 * T * T - 0.05481717 * R * R + 0.00122874 * T * T * R
      + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;
  }
  // Convert back to Celsius
  return Math.round((((HI - 32) * 5) / 9) * 10) / 10;
}

export function evaluateRiskIntelligence(
  air: NormalizedAirQuality,
  weather: NormalizedWeather
): RiskIntelligenceReport {
  const pm25 = air.current.pm2_5;
  const pm10 = air.current.pm10;
  const usAqi = air.current.usAqi;
  const temp = weather.current.temperature;
  const humidity = weather.current.relativeHumidity;
  const windSpeed = weather.current.windSpeed;
  const precip = weather.current.precipitation;
  const weatherCode = weather.current.weatherCode;

  // 1. AQI Standard Evaluation
  let aqiCategory = 'Good';
  let aqiRisk: RiskLevel = 'minimal';
  const effectiveAqi = usAqi ?? (pm25 ? Math.round(pm25 * 2.2) : 50);

  if (effectiveAqi <= 50) {
    aqiCategory = 'Good (0–50)';
    aqiRisk = 'minimal';
  } else if (effectiveAqi <= 100) {
    aqiCategory = 'Moderate (51–100)';
    aqiRisk = 'moderate';
  } else if (effectiveAqi <= 150) {
    aqiCategory = 'Unhealthy for Sensitive Groups (101–150)';
    aqiRisk = 'elevated';
  } else if (effectiveAqi <= 200) {
    aqiCategory = 'Unhealthy (151–200)';
    aqiRisk = 'high';
  } else if (effectiveAqi <= 300) {
    aqiCategory = 'Very Unhealthy (201–300)';
    aqiRisk = 'severe';
  } else {
    aqiCategory = 'Hazardous (>300)';
    aqiRisk = 'hazardous';
  }

  // WHO comparison: 24h mean guideline is 15 µg/m³ for PM2.5, 45 µg/m³ for PM10
  const pm25Ratio = pm25 != null ? (pm25 / 15).toFixed(1) : 'N/A';
  const pm10Ratio = pm10 != null ? (pm10 / 45).toFixed(1) : 'N/A';

  const pm25VsWho = pm25 != null
    ? `${pm25} µg/m³ (${pm25 <= 15 ? 'Within' : `${pm25Ratio}x`} WHO 24-hr guideline of 15 µg/m³)`
    : 'Concentration unavailable';

  const pm10VsWho = pm10 != null
    ? `${pm10} µg/m³ (${pm10 <= 45 ? 'Within' : `${pm10Ratio}x`} WHO 24-hr guideline of 45 µg/m³)`
    : 'Concentration unavailable';

  // 2. Weather & Heat Index Risk
  const heatIndex = calculateHeatIndex(temp, humidity);
  let heatRiskLevel: 'none' | 'caution' | 'extreme_caution' | 'danger' | 'extreme_danger' = 'none';

  if (heatIndex >= 54) {
    heatRiskLevel = 'extreme_danger';
  } else if (heatIndex >= 41) {
    heatRiskLevel = 'danger';
  } else if (heatIndex >= 32) {
    heatRiskLevel = 'extreme_caution';
  } else if (heatIndex >= 27) {
    heatRiskLevel = 'caution';
  }

  // 3. Combined Risk Level Synthesis (Transparent Rules)
  let overallRisk: RiskLevel = 'minimal';
  let overallScore = 20;
  let overallColor = '#10B981'; // Green

  const reasons: string[] = [];

  if (effectiveAqi > 300 || heatRiskLevel === 'extreme_danger' || weatherCode >= 95) {
    overallRisk = 'hazardous';
    overallScore = 95;
    overallColor = '#7F1D1D'; // Deep Maroon
    if (effectiveAqi > 300) reasons.push(`Hazardous PM2.5/AQI levels (${effectiveAqi}) pose emergency health risks`);
    if (heatRiskLevel === 'extreme_danger') reasons.push(`Dangerous heat index (${heatIndex}°C) makes heatstroke highly probable`);
    if (weatherCode >= 95) reasons.push('Severe thunderstorm / squall activity detected');
  } else if (effectiveAqi > 200 || heatRiskLevel === 'danger' || weatherCode === 65) {
    overallRisk = 'severe';
    overallScore = 80;
    overallColor = '#8B5CF6'; // Purple
    if (effectiveAqi > 200) reasons.push(`Very unhealthy air quality (${effectiveAqi} AQI) affects entire population`);
    if (heatRiskLevel === 'danger') reasons.push(`Heat index of ${heatIndex}°C can cause heat cramps and exhaustion with prolonged activity`);
    if (weatherCode === 65) reasons.push('Heavy monsoonal precipitation risking local drainage inundation');
  } else if (effectiveAqi > 150 || heatRiskLevel === 'extreme_caution' || windSpeed > 45) {
    overallRisk = 'high';
    overallScore = 65;
    overallColor = '#EF4444'; // Red
    if (effectiveAqi > 150) reasons.push(`Elevated particulate concentration (${pm25 ?? 'N/A'} µg/m³ PM2.5) exceeds safe health thresholds`);
    if (heatRiskLevel === 'extreme_caution') reasons.push(`High ambient temperature (${temp}°C) combined with ${humidity}% humidity`);
    if (windSpeed > 45) reasons.push(`High sustained wind velocity (${windSpeed} km/h)`);
  } else if (effectiveAqi > 100 || temp >= 35 || precip > 10) {
    overallRisk = 'elevated';
    overallScore = 48;
    overallColor = '#F59E0B'; // Amber
    if (effectiveAqi > 100) reasons.push(`Air quality is in the sensitive threshold (${effectiveAqi} AQI)`);
    if (temp >= 35) reasons.push(`Elevated heat conditions at ${temp}°C`);
    if (precip > 10) reasons.push(`Moderate rainfall (${precip} mm)`);
  } else if (effectiveAqi > 50 || temp >= 30) {
    overallRisk = 'moderate';
    overallScore = 32;
    overallColor = '#84CC16'; // Lime
    reasons.push('Air quality is acceptable for most; mild sensitivity possible for unusually susceptible individuals');
  } else {
    overallRisk = 'minimal';
    overallScore = 15;
    overallColor = '#10B981'; // Emerald
    reasons.push('Clean environmental conditions with low pollutant levels and mild ambient weather');
  }

  // 4. Activity Suitability
  const activitySuitability: ActivitySuitability = {
    running: {
      suitable: effectiveAqi <= 100 && heatRiskLevel !== 'danger' && heatRiskLevel !== 'extreme_danger' && precip < 5,
      rating: effectiveAqi <= 50 && temp < 28 ? 'good' : (effectiveAqi <= 120 && temp < 34 ? 'caution' : 'avoid'),
      advice: effectiveAqi > 150 
        ? 'Avoid vigorous outdoor running. Heavy cardiovascular respiration increases deep lung particulate deposition.'
        : effectiveAqi > 100 
          ? 'Shorten run duration or run indoors. Sensitive individuals should avoid outdoor cardio.'
          : 'Conditions are favorable for outdoor running.'
    },
    cycling: {
      suitable: effectiveAqi <= 120 && windSpeed < 40 && precip < 8,
      rating: effectiveAqi <= 60 && windSpeed < 25 ? 'good' : (effectiveAqi <= 140 ? 'caution' : 'avoid'),
      advice: effectiveAqi > 150 
        ? 'Wear a tight-fitting N95 mask if cycling for unavoidable commutes; avoid intense intervals.'
        : 'Good cycling conditions with manageable wind resistance.'
    },
    childrenElderly: {
      suitable: effectiveAqi <= 80 && heatRiskLevel === 'none',
      rating: effectiveAqi <= 50 ? 'good' : (effectiveAqi <= 100 ? 'caution' : 'avoid'),
      advice: effectiveAqi > 100 
        ? 'Children and elderly adults should minimize prolonged outdoor playtime and exposure.'
        : 'Safe for normal outdoor recreation and walks.'
    },
    ventilation: {
      suitable: effectiveAqi <= 70 && humidity < 80,
      rating: effectiveAqi <= 50 ? 'open' : (effectiveAqi <= 100 ? 'limited' : 'closed'),
      advice: effectiveAqi > 100 
        ? 'Keep windows closed to prevent outdoor particulate matter from infiltrating living spaces. Run HEPA filtration.'
        : 'Open windows during afternoon hours when atmospheric dispersion is peak.'
    },
    maskRecommendation: {
      recommended: effectiveAqi > 120 || (pm25 != null && pm25 > 50),
      maskType: effectiveAqi > 200 ? 'Certified N95 / FFP2 / KN95 with tight facial seal' : 'N95 or high-filtration surgical mask',
      reason: effectiveAqi > 120 
        ? `Fine particles (PM2.5: ${pm25 ?? 'N/A'} µg/m³) bypass the nasal filtration barrier and enter the alveolar bloodstream.`
        : 'Mask not strictly required for healthy individuals at current pollution levels.'
    }
  };

  // 5. Supporting measurements list
  const supportingMeasurements = [
    {
      label: 'US Air Quality Index',
      value: `${effectiveAqi}`,
      unit: 'AQI',
      status: (effectiveAqi <= 50 ? 'optimal' : effectiveAqi <= 100 ? 'moderate' : effectiveAqi <= 200 ? 'unfavorable' : 'hazardous') as any,
      benchmark: 'EPA Standard (0–50 is Good)'
    },
    {
      label: 'PM2.5 Concentration',
      value: pm25 != null ? `${pm25}` : 'N/A',
      unit: 'µg/m³',
      status: (pm25 != null && pm25 <= 15 ? 'optimal' : pm25 != null && pm25 <= 35 ? 'moderate' : 'unfavorable') as any,
      benchmark: 'WHO 24h Guideline: 15 µg/m³'
    },
    {
      label: 'PM10 Coarse Dust',
      value: pm10 != null ? `${pm10}` : 'N/A',
      unit: 'µg/m³',
      status: (pm10 != null && pm10 <= 45 ? 'optimal' : 'moderate') as any,
      benchmark: 'WHO 24h Guideline: 45 µg/m³'
    },
    {
      label: 'Ambient Temperature',
      value: `${temp}`,
      unit: '°C',
      status: (temp >= 18 && temp <= 27 ? 'optimal' : temp >= 38 ? 'unfavorable' : 'moderate') as any,
      benchmark: `Heat Index: ${heatIndex}°C`
    },
    {
      label: 'Wind Speed & Dispersion',
      value: `${windSpeed}`,
      unit: 'km/h',
      status: (windSpeed > 10 && windSpeed < 35 ? 'optimal' : windSpeed <= 5 ? 'unfavorable' : 'moderate') as any,
      benchmark: windSpeed < 6 ? 'Stagnant (Trap Smog)' : 'Active Dispersion'
    }
  ];

  return {
    overallRisk,
    overallScore,
    overallColor,
    summaryTitle: `Environmental Risk: ${overallRisk.toUpperCase()}`,
    reasonForClassification: reasons.join('. ') + '.',
    supportingMeasurements,
    airQualityRisk: {
      category: aqiCategory,
      indexStandard: 'US EPA AQI & European CAQI Standard (Open-Meteo CAMS Model)',
      primaryPollutant: 'PM2.5 (Fine Particulate Matter)',
      pm25VsWhoGuideline: pm25VsWho,
      pm10VsWhoGuideline: pm10VsWho,
      healthImplications: effectiveAqi > 150 
        ? 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.'
        : effectiveAqi > 100 
          ? 'Members of sensitive groups may experience health effects. The general public is not likely to be affected.'
          : 'Air quality is satisfactory, and air pollution poses little or no risk.',
      precautions: [
        effectiveAqi > 100 ? 'Sensitive individuals should wear an N95 mask outside' : 'Enjoy outdoor activities normally',
        effectiveAqi > 150 ? 'Run indoor HEPA purifiers in bedrooms' : 'Keep home ventilated with fresh outdoor air',
        'Stay hydrated to help airway mucous membranes flush airborne particulates'
      ]
    },
    weatherRisk: {
      category: weather.current.weatherCondition,
      heatIndexCelsius: heatIndex,
      heatRiskLevel,
      windCondition: `${windSpeed} km/h (${windSpeed < 8 ? 'Light / Stagnant' : windSpeed < 25 ? 'Moderate' : 'Gusty'})`,
      precipitationRisk: precip > 0 ? `${precip} mm recorded / rain active` : 'No current precipitation',
      comfortSummary: temp > 35 ? 'High thermal stress' : temp < 10 ? 'Cold exposure' : 'Thermally comfortable'
    },
    activitySuitability,
    climateResilienceAdvice: {
      title: 'Climate Resilience & Preparedness Actions',
      bulletPoints: [
        'Check local air quality before scheduling prolonged outdoor athletic events or school sports',
        'Maintain emergency oral rehydration supplies during extreme summer heatwaves',
        'Keep home air filters inspected and cleaned monthly to ensure optimal indoor particulate filtration',
        'Follow local municipal or IMD weather advisories for extreme heat or monsoon waterlogging'
      ]
    },
    dataAttribution: {
      airQualitySource: air.source,
      weatherSource: weather.source,
      lastUpdated: air.lastUpdated,
      limitations: 'Calculations are based on atmospheric chemistry modeling, numerical weather predictions, and transparent rules. This assessment is not an official municipal or emergency decree.'
    }
  };
}
