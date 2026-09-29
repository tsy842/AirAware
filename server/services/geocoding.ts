export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  countryCode?: string;
  admin1?: string; // State or province
  admin2?: string; // District or county
  timezone?: string;
  population?: number;
}

export async function searchLocations(query: string, count: number = 8): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=${count}&language=en&format=json`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AirAware-Intelligence-Platform/1.0'
      }
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo Geocoding API returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((r: any) => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country,
      countryCode: r.country_code,
      admin1: r.admin1,
      admin2: r.admin2,
      timezone: r.timezone,
      population: r.population
    }));
  } catch (error) {
    console.error('Error during geocoding search:', error);
    return [];
  }
}

// Reverse geocoding lookup using OpenStreetMap Nominatim with respectful user-agent
export async function reverseGeocode(lat: number, lon: number): Promise<{ name: string; adminRegion?: string; country?: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AirAware-Platform-Hackathon/1.0 (contact: support@airaware.org)'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const name = addr.city || addr.town || addr.village || addr.county || addr.suburb || data.name || 'Selected Location';
      return {
        name,
        adminRegion: addr.state || addr.province,
        country: addr.country
      };
    }
  } catch (err) {
    console.warn('Reverse geocode fallback error:', err);
  }

  return {
    name: `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`
  };
}
