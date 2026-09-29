export interface User {
  id: string;
  name: string;
  email: string;
  preferredCity?: string;
  preferredLat?: number;
  preferredLon?: number;
  units?: 'metric' | 'imperial';
  createdAt?: string;
}

export interface SavedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  adminRegion?: string;
  country?: string;
  createdAt: string;
}

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

export interface AirQualityData {
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
    pm2_5: number | null;
    pm10: number | null;
    nitrogenDioxide: number | null;
    ozone: number | null;
    carbonMonoxide: number | null;
    sulphurDioxide: number | null;
    dust: number | null;
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
  sevenDayTrends?: DailyAqiTrend[];
  historyHourly?: {
    time: string[];
    usAqi: (number | null)[];
    pm2_5: (number | null)[];
  };
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  timezone: string;
  source: string;
  lastUpdated: string;
  current: {
    temperature: number;
    apparentTemperature: number;
    relativeHumidity: number;
    windSpeed: number;
    windDirection: number;
    windGusts: number | null;
    precipitation: number;
    weatherCode: number;
    weatherCondition: string;
    weatherIcon: string;
    surfacePressure: number | null;
    isDay: boolean;
  };
  daily: {
    time: string[];
    temperatureMax: number[];
    temperatureMin: number[];
    precipitationProbabilityMax: (number | null)[];
    weatherCode: number[];
    sunrise?: string[];
    sunset?: string[];
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

export interface RiskIntelligenceReport {
  overallRisk: 'minimal' | 'moderate' | 'elevated' | 'high' | 'severe' | 'hazardous';
  overallScore: number;
  overallColor: string;
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
    heatRiskLevel: string;
    windCondition: string;
    precipitationRisk: string;
    comfortSummary: string;
  };
  activitySuitability: {
    running: { suitable: boolean; advice: string; rating: 'good' | 'caution' | 'avoid' };
    cycling: { suitable: boolean; advice: string; rating: 'good' | 'caution' | 'avoid' };
    childrenElderly: { suitable: boolean; advice: string; rating: 'good' | 'caution' | 'avoid' };
    ventilation: { suitable: boolean; advice: string; rating: 'open' | 'limited' | 'closed' };
    maskRecommendation: { recommended: boolean; maskType: string; reason: string };
  };
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

export interface EmergencyAlert {
  id: string;
  type: 'cyclone' | 'heatwave' | 'flood' | 'severe_thunderstorm' | 'air_quality_emergency' | 'advisory';
  classification: 'OFFICIAL_GOVERNMENT_WARNING' | 'FORECAST_RISK_ESTIMATE' | 'DEMO_SCENARIO';
  title: string;
  severity: 'moderate' | 'severe' | 'extreme';
  affectedRegions: string[];
  headline: string;
  description: string;
  source: string;
  sourceUrl: string;
  issuedAt: string;
  expiresAt?: string;
  actions: string[];
  emergencyChecklist?: {
    title: string;
    items: string[];
  };
}

export interface AlertRule {
  id: string;
  locationName: string;
  latitude: number;
  longitude: number;
  alertType: 'aqi' | 'pm25' | 'temperature' | 'precipitation' | 'disaster';
  threshold: number;
  comparison: 'above' | 'below';
  enabled: boolean;
  lastEvaluatedAt?: string;
  createdAt: string;
}

export interface AlertEvent {
  id: string;
  locationName: string;
  eventType: string;
  severity: 'low' | 'moderate' | 'high' | 'severe' | 'emergency';
  title: string;
  message: string;
  source: string;
  sourceUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface GeocodingPlace {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  admin2?: string;
}

export interface CitizenReport {
  id: string;
  userId: string;
  reporterName: string;
  locationName: string;
  latitude: number;
  longitude: number;
  emissionType: 'agricultural_burning' | 'industrial_plume' | 'waste_incineration' | 'transboundary_smog' | 'traffic_corridor';
  description: string;
  photoUrl?: string;
  estimatedSeverity: 'moderate' | 'high' | 'severe' | 'hazardous';
  aiAnalysis?: {
    plumeClassification: string;
    opticalOpacityPercent: number;
    estimatedPm25Contribution: number;
    healthAdvisory: string;
    confidence: number;
  };
  upvotes: number;
  status: 'reported' | 'satellite_verified' | 'authority_dispatched' | 'contained';
  assignedAuthority?: string;
  corridorId?: string;
  createdAt: string;
}

export interface CorridorHotspot {
  id: string;
  corridorId: string;
  corridorName: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  hotspotType: 'crop_burning' | 'industrial_smelter' | 'coal_fired_power' | 'refinery_flare' | 'traffic_artery';
  satelliteSource: 'MODIS Aqua/Terra 1km' | 'VIIRS Suomi-NPP 375m' | 'Sentinel-5P TROPOMI' | 'Himawari-9';
  thermalRadiativePowerMW: number;
  estimatedPm25FluxKgPerHour: number;
  windTrajectoryVector: {
    bearingDeg: number;
    speedKmh: number;
    downstreamImpact: string;
  };
  detectedAt: string;
}

export interface BRICSCorridor {
  id: string;
  name: string;
  memberStates: string[];
  economicHubs: string[];
  primaryPollutionDrivers: string[];
  transboundaryRiskLevel: 'moderate' | 'elevated' | 'severe' | 'critical';
  currentAvgAqi: number;
  activeHotspotCount: number;
  leadAgency: string;
  centerCoordinates: { lat: number; lon: number };
  description: string;
}

export interface FederatedNode {
  id: string;
  country: string;
  agency: string;
  nodeUrl: string;
  status: 'online' | 'syncing' | 'degraded';
  sharedModel: string;
  lastSync: string;
  dataVectorsExchanged24h: number;
}
