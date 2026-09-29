interface CachedData<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CachedData<NormalizedWeather>>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface NormalizedWeather {
  latitude: number;
  longitude: number;
  timezone: string;
  source: string;
  lastUpdated: string;
  current: {
    temperature: number; // °C
    apparentTemperature: number; // °C
    relativeHumidity: number; // %
    windSpeed: number; // km/h
    windDirection: number; // degrees
    windGusts: number | null; // km/h
    precipitation: number; // mm
    weatherCode: number;
    weatherCondition: string;
    weatherIcon: string;
    surfacePressure: number | null; // hPa
    isDay: boolean;
  };
  daily: {
    time: string[];
    temperatureMax: number[];
    temperatureMin: number[];
    precipitationProbabilityMax: (number | null)[];
    weatherCode: number[];
    sunrise: string[];
    sunset: string[];
    uvIndexMax: (number | null)[];
  };
  hourly: {
    time: string[];
    temperature: number[];
    relativeHumidity: number[];
    precipitationProbability: (number | null)[];
    windSpeed: number[];
    weatherCode: number[];
  };
}

export function decodeWmoWeather(code: number): { condition: string; icon: string } {
  switch (code) {
    case 0:
      return { condition: 'Clear Sky', icon: 'sun' };
    case 1:
      return { condition: 'Mainly Clear', icon: 'sun-dim' };
    case 2:
      return { condition: 'Partly Cloudy', icon: 'cloud-sun' };
    case 3:
      return { condition: 'Overcast', icon: 'cloud' };
    case 45:
    case 48:
      return { condition: 'Fog & Depositing Rime Fog', icon: 'cloud-fog' };
    case 51:
    case 53:
    case 55:
      return { condition: 'Drizzle', icon: 'cloud-drizzle' };
    case 56:
    case 57:
      return { condition: 'Freezing Drizzle', icon: 'cloud-snow' };
    case 61:
      return { condition: 'Slight Rain', icon: 'cloud-rain' };
    case 63:
      return { condition: 'Moderate Rain', icon: 'cloud-rain' };
    case 65:
      return { condition: 'Heavy Rain', icon: 'cloud-lightning-rain' };
    case 66:
    case 67:
      return { condition: 'Freezing Rain', icon: 'cloud-snow' };
    case 71:
    case 73:
    case 75:
      return { condition: 'Snow Fall', icon: 'snowflake' };
    case 77:
      return { condition: 'Snow Grains', icon: 'snowflake' };
    case 80:
    case 81:
    case 82:
      return { condition: 'Rain Showers', icon: 'cloud-rain' };
    case 85:
    case 86:
      return { condition: 'Snow Showers', icon: 'snowflake' };
    case 95:
      return { condition: 'Thunderstorm', icon: 'cloud-lightning' };
    case 96:
    case 99:
      return { condition: 'Thunderstorm with Severe Hail', icon: 'zap' };
    default:
      return { condition: 'Fair Weather', icon: 'cloud-sun' };
  }
}

export async function fetchWeather(lat: number, lon: number): Promise<NormalizedWeather> {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Open-Meteo Forecast API
  // Documentation: https://open-meteo.com/en/docs
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day',
    hourly: 'temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset',
    timezone: 'auto',
    forecast_days: '5'
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AirAware-Intelligence-Platform/1.0'
      }
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo Weather API responded with status ${res.status}`);
    }

    const data = await res.json();
    const current = data.current || {};
    const daily = data.daily || {};
    const hourly = data.hourly || {};

    const weatherCode = current.weather_code ?? 0;
    const { condition, icon } = decodeWmoWeather(weatherCode);

    const normalized: NormalizedWeather = {
      latitude: data.latitude ?? lat,
      longitude: data.longitude ?? lon,
      timezone: data.timezone ?? 'UTC',
      source: 'Open-Meteo Global Weather Models (ECMWF & GFS)',
      lastUpdated: current.time || new Date().toISOString(),
      current: {
        temperature: Math.round((current.temperature_2m ?? 0) * 10) / 10,
        apparentTemperature: Math.round((current.apparent_temperature ?? current.temperature_2m ?? 0) * 10) / 10,
        relativeHumidity: Math.round(current.relative_humidity_2m ?? 0),
        windSpeed: Math.round((current.wind_speed_10m ?? 0) * 10) / 10,
        windDirection: Math.round(current.wind_direction_10m ?? 0),
        windGusts: current.wind_gusts_10m != null ? Math.round(current.wind_gusts_10m * 10) / 10 : null,
        precipitation: Math.round((current.precipitation ?? 0) * 10) / 10,
        weatherCode,
        weatherCondition: condition,
        weatherIcon: icon,
        surfacePressure: current.surface_pressure != null ? Math.round(current.surface_pressure) : null,
        isDay: (current.is_day ?? 1) === 1
      },
      daily: {
        time: daily.time || [],
        temperatureMax: (daily.temperature_2m_max || []).map((t: number) => Math.round(t * 10) / 10),
        temperatureMin: (daily.temperature_2m_min || []).map((t: number) => Math.round(t * 10) / 10),
        precipitationProbabilityMax: daily.precipitation_probability_max || [],
        weatherCode: daily.weather_code || [],
        sunrise: daily.sunrise || [],
        sunset: daily.sunset || [],
        uvIndexMax: daily.uv_index_max || []
      },
      hourly: {
        time: (hourly.time || []).slice(0, 36),
        temperature: (hourly.temperature_2m || []).slice(0, 36).map((t: number) => Math.round(t * 10) / 10),
        relativeHumidity: (hourly.relative_humidity_2m || []).slice(0, 36),
        precipitationProbability: (hourly.precipitation_probability || []).slice(0, 36),
        windSpeed: (hourly.wind_speed_10m || []).slice(0, 36).map((w: number) => Math.round(w * 10) / 10),
        weatherCode: (hourly.weather_code || []).slice(0, 36)
      }
    };

    cache.set(cacheKey, { data: normalized, timestamp: Date.now() });
    return normalized;
  } catch (error) {
    console.error('Error fetching weather from Open-Meteo:', error);
    if (cached) return cached.data;
    throw error;
  }
}
