import {
  AirQualityData,
  WeatherData,
  RiskIntelligenceReport,
  EmergencyAlert,
  AlertRule,
  AlertEvent,
  GeocodingPlace,
  User,
  SavedLocation,
  CitizenReport,
  CorridorHotspot,
  BRICSCorridor,
  FederatedNode
} from '../types';

let authToken: string | null = localStorage.getItem('airaware_token');

export function setApiToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('airaware_token', token);
  } else {
    localStorage.removeItem('airaware_token');
  }
}

export function getApiToken(): string | null {
  return authToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || errorBody.detail || `Request failed with status ${res.status}`);
  }

  return res.json();
}

// -------------------------------------------------------------
// Real Live API Calls
// -------------------------------------------------------------

export const api = {
  // Environmental & Weather
  getAirQuality: (lat: number, lon: number) =>
    request<AirQualityData>(`/api/environmental/current?latitude=${lat}&longitude=${lon}`),

  getWeather: (lat: number, lon: number) =>
    request<WeatherData>(`/api/weather/current?latitude=${lat}&longitude=${lon}`),

  getRiskReport: (lat: number, lon: number) =>
    request<RiskIntelligenceReport>(`/api/environmental/risk?latitude=${lat}&longitude=${lon}`),

  // Geocoding
  searchLocations: (query: string) =>
    request<{ results: GeocodingPlace[] }>(`/api/geocoding/search?q=${encodeURIComponent(query)}`),

  reverseGeocode: (lat: number, lon: number) =>
    request<{ name: string; adminRegion?: string; country?: string }>(`/api/geocoding/reverse?latitude=${lat}&longitude=${lon}`),

  detectUserLocation: async (): Promise<{
    latitude: number;
    longitude: number;
    name: string;
    adminRegion?: string;
    country?: string;
    source: 'gps' | 'ip';
    accuracy?: number;
  }> => {
    // 1. Try browser HTML5 GPS first
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 6000,
            maximumAge: 30000
          });
        });
        const { latitude, longitude, accuracy } = position.coords;
        try {
          const geo = await api.reverseGeocode(latitude, longitude);
          return {
            latitude,
            longitude,
            name: geo.name || `My Location (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`,
            adminRegion: geo.adminRegion,
            country: geo.country || 'India',
            source: 'gps',
            accuracy: Math.round(accuracy)
          };
        } catch {
          return {
            latitude,
            longitude,
            name: `My Location (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`,
            country: 'India',
            source: 'gps',
            accuracy: Math.round(accuracy)
          };
        }
      } catch (gpsError) {
        console.warn('GPS geolocation not granted or timed out, trying IP location fallback...', gpsError);
      }
    }

    // 2. Fallback to IP-based location
    try {
      const res = await fetch('https://ipapi.co/json/', { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          return {
            latitude: data.latitude,
            longitude: data.longitude,
            name: data.city || data.region || 'Current Location',
            adminRegion: data.region,
            country: data.country_name || 'India',
            source: 'ip'
          };
        }
      }
    } catch (ipErr) {
      console.warn('IP geolocation service fallback failed:', ipErr);
    }

    // 3. Default India fallback (Delhi NCR / Gurugram)
    return {
      latitude: 28.4595,
      longitude: 77.0266,
      name: 'Gurugram',
      adminRegion: 'Haryana',
      country: 'India',
      source: 'ip'
    };
  },

  // Emergency Bulletins
  getEmergencyAlerts: (lat?: number, lon?: number, locationName?: string) => {
    const params = new URLSearchParams();
    if (lat) params.append('latitude', lat.toString());
    if (lon) params.append('longitude', lon.toString());
    if (locationName) params.append('locationName', locationName);
    return request<{ alerts: EmergencyAlert[] }>(`/api/emergency/alerts?${params.toString()}`);
  },

  getDemoScenarios: () =>
    request<{ scenarios: EmergencyAlert[] }>(`/api/emergency/scenarios`),

  // Alerts Management
  getAlertRules: () =>
    request<{ rules: AlertRule[] }>(`/api/alerts`),

  createAlertRule: (rule: Omit<AlertRule, 'id' | 'enabled' | 'createdAt' | 'lastEvaluatedAt'>) =>
    request<{ rule: AlertRule }>(`/api/alerts`, {
      method: 'POST',
      body: JSON.stringify(rule)
    }),

  deleteAlertRule: (id: string) =>
    request<{ success: boolean }>(`/api/alerts/${id}`, {
      method: 'DELETE'
    }),

  getAlertEvents: () =>
    request<{ events: AlertEvent[] }>(`/api/alerts/events`),

  markEventRead: (id: string) =>
    request<{ success: boolean }>(`/api/alerts/events/${id}/read`, {
      method: 'PATCH'
    }),

  markAllEventsRead: () =>
    request<{ success: boolean; markedCount: number }>(`/api/alerts/events/read-all`, {
      method: 'POST'
    }),

  evaluateAlertsNow: () =>
    request<{ message: string; evaluatedCount: number; newEventsCount: number }>(`/api/alerts/evaluate`, {
      method: 'POST'
    }),

  // AI Environmental Assistant
  askAiAssistant: (question: string, context: any) =>
    request<{ text: string; source: 'gemini' | 'deterministic_fallback'; model: string }>(`/api/ai/chat`, {
      method: 'POST',
      body: JSON.stringify({ question, context })
    }),

  // BRICS Federated Corridors & Satellite Hotspots
  getBricsCorridors: () =>
    request<{ corridors: BRICSCorridor[] }>(`/api/brics/corridors`),

  getCorridorHotspots: (corridorId?: string) =>
    request<{ hotspots: CorridorHotspot[] }>(`/api/brics/hotspots${corridorId ? `?corridorId=${corridorId}` : ''}`),

  getFederatedNodes: () =>
    request<{ nodes: FederatedNode[] }>(`/api/brics/nodes`),

  syncFederatedNode: (id: string) =>
    request<{ success: boolean; node: FederatedNode }>(`/api/brics/nodes/${id}/sync`, {
      method: 'POST'
    }),

  // Citizen-Sourced Incident Intelligence & AI Plume Verification
  getCitizenReports: () =>
    request<{ reports: CitizenReport[] }>(`/api/citizen/reports`),

  submitCitizenReport: (data: {
    locationName: string;
    latitude: number;
    longitude: number;
    emissionType: string;
    description: string;
    photoUrl?: string;
    imageBase64?: string;
    estimatedSeverity?: string;
    corridorId?: string;
  }) =>
    request<{ report: CitizenReport; aiAnalysis: any }>(`/api/citizen/reports`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  upvoteCitizenReport: (id: string) =>
    request<{ success: boolean; upvotes: number; report: CitizenReport }>(`/api/citizen/reports/${id}/vote`, {
      method: 'POST'
    }),

  dispatchAuthorityTicket: (id: string, authorityName?: string) =>
    request<{ success: boolean; message: string; report: CitizenReport }>(`/api/citizen/reports/${id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({ authorityName })
    }),

  // User & Locations
  getProfile: () =>
    request<{ user: User }>(`/api/auth/me`),

  updateProfile: (updates: Partial<User>) =>
    request<{ user: User }>(`/api/users/me`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),

  getSavedLocations: () =>
    request<{ locations: SavedLocation[] }>(`/api/users/locations`),

  addSavedLocation: (loc: { name: string; latitude: number; longitude: number; adminRegion?: string; country?: string }) =>
    request<{ location: SavedLocation }>(`/api/users/locations`, {
      method: 'POST',
      body: JSON.stringify(loc)
    }),

  deleteSavedLocation: (id: string) =>
    request<{ success: boolean }>(`/api/users/locations/${id}`, {
      method: 'DELETE'
    }),

  // Auth
  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: User }>(`/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: User }>(`/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
};

// -------------------------------------------------------------
// Curated Demo Mode Datasets (clearly labeled DEMO DATA)
// -------------------------------------------------------------

export function getDemoModeData(scenario: string): {
  air: AirQualityData;
  weather: WeatherData;
  risk: RiskIntelligenceReport;
  alerts: EmergencyAlert[];
} {
  const isCyclone = scenario === 'cyclone_alert';
  const isHeatwave = scenario === 'extreme_heatwave';
  const isClean = scenario === 'mountain_clean';
  // Default is Gurugram Winter Smog
  const aqiVal = isClean ? 28 : isHeatwave ? 142 : isCyclone ? 88 : 265;
  const pm25Val = isClean ? 7.2 : isHeatwave ? 52.4 : isCyclone ? 24.1 : 148.6;
  const tempVal = isClean ? 18.5 : isHeatwave ? 44.2 : isCyclone ? 26.8 : 22.4;
  const windVal = isCyclone ? 95.0 : isClean ? 12.0 : 4.8;
  const precipVal = isCyclone ? 68.0 : 0.0;

  const mockAir: AirQualityData = {
    latitude: 28.4595,
    longitude: 77.0266,
    timezone: 'Asia/Kolkata',
    source: '[DEMO DATA] AirAware Simulation Engine (CAMS Simulation Profile)',
    isModelEstimate: true,
    disclaimer: 'DEMO MODE ACTIVE: This dataset contains simulated environmental values for presentation and evaluator testing.',
    lastUpdated: new Date().toISOString(),
    current: {
      usAqi: aqiVal,
      europeanAqi: isClean ? 15 : 98,
      pm2_5: pm25Val,
      pm10: pm25Val * 1.8,
      nitrogenDioxide: isClean ? 12.0 : 64.5,
      ozone: isHeatwave ? 85.0 : 38.0,
      carbonMonoxide: 1200.0,
      sulphurDioxide: 18.4,
      dust: 45.0,
      uvIndex: isHeatwave ? 9.5 : 4.0
    },
    hourly: {
      time: Array.from({ length: 24 }, (_, i) => `${(i).toString().padStart(2, '0')}:00`),
      pm2_5: Array.from({ length: 24 }, (_, i) => Math.round(pm25Val * (0.8 + Math.sin(i / 3) * 0.3) * 10) / 10),
      pm10: Array.from({ length: 24 }, (_, i) => Math.round(pm25Val * 1.8 * (0.8 + Math.sin(i / 3) * 0.3) * 10) / 10),
      usAqi: Array.from({ length: 24 }, (_, i) => Math.round(aqiVal * (0.85 + Math.sin(i / 3) * 0.25))),
      europeanAqi: Array.from({ length: 24 }, () => 80),
      ozone: Array.from({ length: 24 }, (_, i) => Math.round(40 + i * 1.5))
    },
    sevenDayTrends: Array.from({ length: 7 }, (_, i) => {
      const dayOffset = 6 - i;
      const d = new Date(Date.now() - dayOffset * 86400000);
      const factor = 0.75 + Math.sin(i * 1.2) * 0.35;
      const dayAqi = Math.round(aqiVal * factor);
      const dayPm25 = Math.round(pm25Val * factor * 10) / 10;
      const category = dayAqi <= 50 ? 'Good' : dayAqi <= 100 ? 'Moderate' : dayAqi <= 150 ? 'Unhealthy for Sensitive Groups' : dayAqi <= 200 ? 'Unhealthy' : dayAqi <= 300 ? 'Very Unhealthy' : 'Hazardous';
      const color = dayAqi <= 50 ? '#10B981' : dayAqi <= 100 ? '#84CC16' : dayAqi <= 150 ? '#F59E0B' : dayAqi <= 200 ? '#EF4444' : dayAqi <= 300 ? '#8B5CF6' : '#7F1D1D';
      return {
        date: d.toISOString().split('T')[0],
        dayLabel: d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
        avgAqi: dayAqi,
        maxAqi: Math.round(dayAqi * 1.25),
        minAqi: Math.max(10, Math.round(dayAqi * 0.75)),
        avgPm25: dayPm25,
        category,
        color,
        timestamp: d.getTime()
      };
    }),
    historyHourly: {
      time: Array.from({ length: 168 }, (_, i) => {
        const d = new Date(Date.now() - (167 - i) * 3600000);
        return d.toISOString();
      }),
      usAqi: Array.from({ length: 168 }, (_, i) => Math.round(aqiVal * (0.7 + Math.sin(i / 12) * 0.35 + Math.cos(i / 24) * 0.15))),
      pm2_5: Array.from({ length: 168 }, (_, i) => Math.round(pm25Val * (0.7 + Math.sin(i / 12) * 0.35) * 10) / 10)
    }
  };

  const mockWeather: WeatherData = {
    latitude: 28.4595,
    longitude: 77.0266,
    timezone: 'Asia/Kolkata',
    source: '[DEMO DATA] Atmospheric Model Simulator',
    lastUpdated: new Date().toISOString(),
    current: {
      temperature: tempVal,
      apparentTemperature: isHeatwave ? 49.0 : tempVal + 1,
      relativeHumidity: isCyclone ? 94 : isHeatwave ? 35 : 62,
      windSpeed: windVal,
      windDirection: 280,
      windGusts: isCyclone ? 125 : 12,
      precipitation: precipVal,
      weatherCode: isCyclone ? 95 : isHeatwave ? 0 : 45,
      weatherCondition: isCyclone ? 'Severe Thunderstorm & Squall' : isHeatwave ? 'Extreme Heat & Sun' : 'Smog & Low Visibility Fog',
      weatherIcon: isCyclone ? 'cloud-lightning-rain' : isHeatwave ? 'sun' : 'cloud-fog',
      surfacePressure: isCyclone ? 988 : 1012,
      isDay: true
    },
    daily: {
      time: ['Today', '+1 Day', '+2 Days', '+3 Days', '+4 Days'],
      temperatureMax: [tempVal, tempVal + 1, tempVal - 1, tempVal, tempVal + 2],
      temperatureMin: [tempVal - 8, tempVal - 7, tempVal - 9, tempVal - 8, tempVal - 7],
      precipitationProbabilityMax: [isCyclone ? 100 : 5, isCyclone ? 80 : 0, 10, 0, 0],
      weatherCode: [isCyclone ? 95 : 45, 45, 1, 1, 2]
    },
    hourly: {
      time: Array.from({ length: 24 }, (_, i) => `${(i).toString().padStart(2, '0')}:00`),
      temperature: Array.from({ length: 24 }, (_, i) => Math.round((tempVal - 5 + Math.sin(i / 4) * 8) * 10) / 10),
      relativeHumidity: Array.from({ length: 24 }, (_, i) => Math.round(50 + Math.cos(i / 4) * 25)),
      precipitationProbability: Array.from({ length: 24 }, () => isCyclone ? 90 : 0),
      windSpeed: Array.from({ length: 24 }, () => windVal),
      weatherCode: Array.from({ length: 24 }, () => isCyclone ? 95 : 3)
    }
  };

  const mockRisk: RiskIntelligenceReport = {
    overallRisk: aqiVal > 200 || isCyclone ? 'severe' : aqiVal > 150 ? 'high' : aqiVal > 100 ? 'elevated' : 'minimal',
    overallScore: aqiVal > 200 || isCyclone ? 88 : aqiVal > 150 ? 68 : 22,
    overallColor: aqiVal > 200 ? '#8B5CF6' : aqiVal > 150 ? '#EF4444' : '#10B981',
    summaryTitle: `Environmental Risk: ${(aqiVal > 200 || isCyclone ? 'SEVERE' : aqiVal > 150 ? 'HIGH' : 'MINIMAL')}`,
    reasonForClassification: isCyclone
      ? 'DEMO: Dangerous landfall wind gusts (>120 km/h) and severe localized precipitation.'
      : isHeatwave
        ? 'DEMO: Extreme thermal radiation with heat index reaching 49°C.'
        : isClean
          ? 'DEMO: Pristine montane air quality well within WHO air safety guidelines.'
          : 'DEMO: Severe particulate accumulation (PM2.5: 148.6 µg/m³, ~10x WHO guideline) trapped under atmospheric inversion layer.',
    supportingMeasurements: [
      {
        label: 'Simulated AQI',
        value: `${aqiVal}`,
        unit: 'AQI',
        status: (aqiVal > 150 ? 'unfavorable' : aqiVal > 100 ? 'moderate' : 'optimal') as any,
        benchmark: 'US EPA Standard'
      },
      {
        label: 'PM2.5 Concentration',
        value: `${pm25Val}`,
        unit: 'µg/m³',
        status: (pm25Val > 35 ? 'unfavorable' : 'optimal') as any,
        benchmark: 'WHO limit: 15 µg/m³'
      },
      {
        label: 'Ambient Temperature',
        value: `${tempVal}`,
        unit: '°C',
        status: (tempVal > 38 ? 'unfavorable' : 'optimal') as any,
        benchmark: `Feels Like: ${isHeatwave ? '49°C' : `${tempVal}°C`}`
      }
    ],
    airQualityRisk: {
      category: aqiVal > 200 ? 'Very Unhealthy' : aqiVal > 150 ? 'Unhealthy' : 'Good',
      indexStandard: 'US EPA Standard (DEMO SIMULATION)',
      primaryPollutant: 'PM2.5 (Fine Combustion Particulate)',
      pm25VsWhoGuideline: `${pm25Val} µg/m³ (${(pm25Val / 15).toFixed(1)}x WHO 24h baseline)`,
      pm10VsWhoGuideline: `${pm25Val * 1.8} µg/m³`,
      healthImplications: aqiVal > 150
        ? 'Significant irritation and adverse respiratory symptoms across general population.'
        : 'Satisfactory ambient air with minimal baseline risk.',
      precautions: [
        'Wear a certified N95 / FFP2 respirator outdoors',
        'Operate indoor HEPA air purification',
        'Keep room doors and window frames sealed'
      ]
    },
    weatherRisk: {
      category: mockWeather.current.weatherCondition,
      heatIndexCelsius: isHeatwave ? 49 : tempVal,
      heatRiskLevel: isHeatwave ? 'danger' : 'none',
      windCondition: `${windVal} km/h`,
      precipitationRisk: precipVal > 0 ? `${precipVal} mm` : 'None',
      comfortSummary: isHeatwave ? 'Severe Heat Stress' : 'Moderate'
    },
    activitySuitability: {
      running: {
        suitable: aqiVal <= 100 && !isCyclone && !isHeatwave,
        rating: aqiVal <= 50 ? 'good' : aqiVal <= 120 ? 'caution' : 'avoid',
        advice: aqiVal > 150 ? 'Avoid outdoor running. Fine particles enter deep bronchial passages.' : 'Safe for workouts.'
      },
      cycling: {
        suitable: aqiVal <= 120 && windVal < 40,
        rating: aqiVal <= 70 ? 'good' : 'avoid',
        advice: aqiVal > 150 ? 'Avoid non-essential cycling outdoors.' : 'Favorable cycling.'
      },
      childrenElderly: {
        suitable: aqiVal <= 80 && !isHeatwave,
        rating: aqiVal <= 60 ? 'good' : 'avoid',
        advice: aqiVal > 100 ? 'Keep children and seniors indoors.' : 'Safe for park walks.'
      },
      ventilation: {
        suitable: aqiVal <= 70,
        rating: aqiVal <= 70 ? 'open' : 'closed',
        advice: aqiVal > 100 ? 'Keep windows firmly closed.' : 'Fresh outdoor ventilation recommended.'
      },
      maskRecommendation: {
        recommended: aqiVal > 120,
        maskType: 'Certified N95 / KN95 Respirator',
        reason: 'Simulated PM2.5 requires filtration to protect respiratory tract.'
      }
    },
    climateResilienceAdvice: {
      title: 'Demo Climate Resilience Checklist',
      bulletPoints: [
        'Keep emergency hydration and ORS packets stocked',
        'Seal domestic windows to prevent smog infiltration',
        'Follow local official emergency broadcasts during storm events'
      ]
    },
    dataAttribution: {
      airQualitySource: 'AirAware Demonstration Scenario Engine',
      weatherSource: 'AirAware Demonstration Scenario Engine',
      lastUpdated: new Date().toISOString(),
      limitations: 'DEMO DATASET: Values are simulated for hackathon evaluation and demonstration purposes.'
    }
  };

  const alerts: EmergencyAlert[] = isCyclone
    ? [
        {
          id: 'demo_cyclone_alert',
          type: 'cyclone',
          classification: 'DEMO_SCENARIO',
          title: '[DEMO DATA] Very Severe Cyclonic Storm Warning',
          severity: 'extreme',
          affectedRegions: ['East Coast', 'Coastal Districts'],
          headline: 'Sustained winds 120–135 km/h with heavy tidal storm surge.',
          description: 'DEMONSTRATION SCENARIO: Illustrating coastal disaster readiness and municipal coordination.',
          source: 'AirAware Simulation Engine',
          sourceUrl: 'https://rsmcnewdelhi.imd.gov.in',
          issuedAt: new Date().toISOString(),
          actions: [
            'Follow all official local evacuation instructions',
            'Secure loose outdoor tin sheets and furniture',
            'Disconnect main electrical switches during flooding'
          ],
          emergencyChecklist: {
            title: 'Cyclone Survival Emergency Kit',
            items: [
              'Store minimum 3 days of potable drinking water',
              'Battery-powered radio and multi-lumen LED lanterns',
              'Keep identification documents and insurance papers in a sealed waterproof bag',
              'First aid kit with antiseptics and essential prescription medications'
            ]
          }
        }
      ]
    : [
        {
          id: 'demo_smog_alert',
          type: 'air_quality_emergency',
          classification: 'DEMO_SCENARIO',
          title: '[DEMO DATA] Severe Winter Inversion & Smog Advisory',
          severity: 'severe',
          affectedRegions: ['Gurugram', 'Delhi NCR', 'Indo-Gangetic Plain'],
          headline: 'Boundary layer wind drop (<5 km/h) locking fine particulates over city core.',
          description: 'DEMONSTRATION SCENARIO: Modeling how air dispersion stagnation triggers early health alerts.',
          source: 'AirAware Simulation Engine',
          sourceUrl: 'https://air-quality-api.open-meteo.com',
          issuedAt: new Date().toISOString(),
          actions: [
            'Sensitive individuals should refrain from morning outdoor walking',
            'Wear certified N95 respirators when commuting',
            'Ensure HEPA filters in living and sleeping quarters are operating'
          ],
          emergencyChecklist: {
            title: 'Clean Air Protection Kit',
            items: [
              'Check filter saturation on indoor air purifiers',
              'Seal gap beneath exterior doors with weather stripping',
              'Stock emergency asthma inhalers or antihistamines if sensitive'
            ]
          }
        }
      ];

  return { air: mockAir, weather: mockWeather, risk: mockRisk, alerts };
}
