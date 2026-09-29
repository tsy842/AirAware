interface CachedData<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CachedData<NormalizedAirQuality>>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface DailyAqiTrend {
  date: string;
  dayLabel: string;
  avgAqi: number;
  maxAqi: number;
  minAqi: number;
  avgPm25: number;
  category: string;
  color: string;
  timestamp: number;
}

export interface NormalizedAirQuality {
  latitude: number;
  longitude: number;
  timezone: string;
  source: string;
  isModelEstimate: boolean;
  disclaimer: string;
  lastUpdated: string;
  current: {
    usAqi: number | null;
    europeanAqi: number | null;
    pm2_5: number | null; // µg/m³
    pm10: number | null;  // µg/m³
    nitrogenDioxide: number | null; // µg/m³
    ozone: number | null; // µg/m³
    carbonMonoxide: number | null; // µg/m³
    sulphurDioxide: number | null; // µg/m³
    dust: number | null; // µg/m³
    uvIndex: number | null;
  };
  hourly: {
    time: string[];
    pm2_5: (number | null)[];
    pm10: (number | null)[];
    usAqi: (number | null)[];
    europeanAqi: (number | null)[];
    ozone: (number | null)[];
  };
  sevenDayTrends: DailyAqiTrend[];
  historyHourly: {
    time: string[];
    usAqi: (number | null)[];
    pm2_5: (number | null)[];
  };
}

function getAqiCategoryAndColor(aqi: number): { category: string; color: string } {
  if (aqi <= 50) return { category: 'Good', color: '#10B981' };
  if (aqi <= 100) return { category: 'Moderate', color: '#84CC16' };
  if (aqi <= 150) return { category: 'Unhealthy for Sensitive Groups', color: '#F59E0B' };
  if (aqi <= 200) return { category: 'Unhealthy', color: '#EF4444' };
  if (aqi <= 300) return { category: 'Very Unhealthy', color: '#8B5CF6' };
  return { category: 'Hazardous', color: '#7F1D1D' };
}

export async function fetchAirQuality(lat: number, lon: number): Promise<NormalizedAirQuality> {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Open-Meteo Air Quality API with 7-day past history + 1-day forecast
  // Documentation: https://air-quality-api.open-meteo.com/v1/air-quality
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: 'european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,uv_index',
    hourly: 'pm10,pm2_5,european_aqi,us_aqi,ozone',
    timezone: 'auto',
    past_days: '7',
    forecast_days: '1'
  });

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AirAware-Intelligence-Platform/1.0'
      }
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo Air Quality API responded with status ${res.status}`);
    }

    const data = await res.json();
    const current = data.current || {};
    const hourly = data.hourly || {};

    const rawTimes: string[] = hourly.time || [];
    const rawUsAqi: (number | null)[] = hourly.us_aqi || [];
    const rawPm25: (number | null)[] = hourly.pm2_5 || [];

    // Group the 7 days of historical hourly data by date
    const dailyMap = new Map<string, { aqiVals: number[]; pm25Vals: number[] }>();

    rawTimes.forEach((tStr, idx) => {
      const dateKey = tStr.split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { aqiVals: [], pm25Vals: [] });
      }
      const aqi = rawUsAqi[idx];
      const pm = rawPm25[idx];
      if (aqi != null) dailyMap.get(dateKey)!.aqiVals.push(aqi);
      if (pm != null) dailyMap.get(dateKey)!.pm25Vals.push(pm);
    });

    // Compute daily averages and peaks for the last 7 days
    const sevenDayTrends: DailyAqiTrend[] = [];
    const sortedDates = Array.from(dailyMap.keys()).sort();
    
    // Take the most recent 7 past days
    const pastSevenDates = sortedDates.slice(-8, -1);
    const targetDates = pastSevenDates.length >= 7 ? pastSevenDates : sortedDates.slice(-7);

    targetDates.forEach(dStr => {
      const entry = dailyMap.get(dStr)!;
      const aqis = entry.aqiVals;
      const pms = entry.pm25Vals;

      const avgAqi = aqis.length > 0 ? Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length) : 50;
      const maxAqi = aqis.length > 0 ? Math.max(...aqis) : avgAqi;
      const minAqi = aqis.length > 0 ? Math.min(...aqis) : avgAqi;
      const avgPm25 = pms.length > 0 ? Math.round((pms.reduce((a, b) => a + b, 0) / pms.length) * 10) / 10 : 25;

      const { category, color } = getAqiCategoryAndColor(avgAqi);
      const dateObj = new Date(`${dStr}T12:00:00Z`);
      const dayLabel = dateObj.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

      sevenDayTrends.push({
        date: dStr,
        dayLabel,
        avgAqi,
        maxAqi,
        minAqi,
        avgPm25,
        category,
        color,
        timestamp: dateObj.getTime()
      });
    });

    // Take the last 24 hours for the short hourly view
    const last24Times = rawTimes.slice(-24);
    const last24Pm25 = rawPm25.slice(-24);
    const last24Pm10 = (hourly.pm10 || []).slice(-24);
    const last24UsAqi = rawUsAqi.slice(-24);
    const last24EuroAqi = (hourly.european_aqi || []).slice(-24);
    const last24Ozone = (hourly.ozone || []).slice(-24);

    const normalized: NormalizedAirQuality = {
      latitude: data.latitude ?? lat,
      longitude: data.longitude ?? lon,
      timezone: data.timezone ?? 'UTC',
      source: 'Open-Meteo Air Quality Atmospheric Chemistry Model (CAMS & SILAM)',
      isModelEstimate: true,
      disclaimer: 'Air quality values are atmospheric model forecasts and estimates derived from Copernicus Atmosphere Monitoring Service (CAMS). They are not regulatory ground-sensor measurements.',
      lastUpdated: current.time || new Date().toISOString(),
      current: {
        usAqi: current.us_aqi != null ? Math.round(current.us_aqi) : null,
        europeanAqi: current.european_aqi != null ? Math.round(current.european_aqi) : null,
        pm2_5: current.pm2_5 != null ? Math.round(current.pm2_5 * 10) / 10 : null,
        pm10: current.pm10 != null ? Math.round(current.pm10 * 10) / 10 : null,
        nitrogenDioxide: current.nitrogen_dioxide != null ? Math.round(current.nitrogen_dioxide * 10) / 10 : null,
        ozone: current.ozone != null ? Math.round(current.ozone * 10) / 10 : null,
        carbonMonoxide: current.carbon_monoxide != null ? Math.round(current.carbon_monoxide * 10) / 10 : null,
        sulphurDioxide: current.sulphur_dioxide != null ? Math.round(current.sulphur_dioxide * 10) / 10 : null,
        dust: current.dust != null ? Math.round(current.dust * 10) / 10 : null,
        uvIndex: current.uv_index != null ? Math.round(current.uv_index * 10) / 10 : null
      },
      hourly: {
        time: last24Times,
        pm2_5: last24Pm25,
        pm10: last24Pm10,
        usAqi: last24UsAqi,
        europeanAqi: last24EuroAqi,
        ozone: last24Ozone
      },
      sevenDayTrends,
      historyHourly: {
        time: rawTimes,
        usAqi: rawUsAqi,
        pm2_5: rawPm25
      }
    };

    cache.set(cacheKey, { data: normalized, timestamp: Date.now() });
    return normalized;
  } catch (error) {
    console.error('Error fetching air quality from Open-Meteo:', error);
    if (cached) {
      return {
        ...cached.data,
        disclaimer: `${cached.data.disclaimer} (Note: Showing cached data from ${new Date(cached.timestamp).toLocaleTimeString()})`
      };
    }
    throw error;
  }
}
