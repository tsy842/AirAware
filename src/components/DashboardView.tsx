import React, { useState } from 'react';
import { 
  Wind, 
  Thermometer, 
  Droplets, 
  Compass, 
  CloudRain, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  Bookmark, 
  Check, 
  Info, 
  Clock, 
  Sun, 
  Activity, 
  Layers, 
  ChevronRight,
  ShieldAlert,
  Footprints,
  Bike,
  Baby,
  DoorOpen
} from 'lucide-react';
import { AirQualityData, WeatherData, RiskIntelligenceReport, EmergencyAlert } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { D3AqiTrendsChart } from './D3AqiTrendsChart';
import { DashboardMiniMap } from './DashboardMiniMap';

interface DashboardViewProps {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    adminRegion?: string;
    country?: string;
  };
  airData: AirQualityData | null;
  weatherData: WeatherData | null;
  riskReport: RiskIntelligenceReport | null;
  alerts: EmergencyAlert[];
  isLoading: boolean;
  onNavigateToAi: () => void;
  onNavigateToAlerts: () => void;
  onNavigateToMap: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  location,
  airData,
  weatherData,
  riskReport,
  alerts,
  isLoading,
  onNavigateToAi,
  onNavigateToAlerts,
  onNavigateToMap
}) => {
  const { user, savedLocations, addLocation, removeLocation } = useAuth();
  const { isDemoMode } = useDemo();
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [selectedHourlyMetric, setSelectedHourlyMetric] = useState<'pm2_5' | 'usAqi' | 'temperature'>('pm2_5');

  const isSaved = savedLocations.some(
    loc => loc.name.toLowerCase() === location.name.toLowerCase() ||
      (Math.abs(loc.latitude - location.latitude) < 0.05 && Math.abs(loc.longitude - location.longitude) < 0.05)
  );

  const handleToggleSave = async () => {
    if (!user) return;
    try {
      if (isSaved) {
        const found = savedLocations.find(l => l.name.toLowerCase() === location.name.toLowerCase());
        if (found) await removeLocation(found.id);
      } else {
        await addLocation({
          name: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
          adminRegion: location.adminRegion,
          country: location.country
        });
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to toggle save:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-slate-800 border-t-teal-400 rounded-full animate-spin" />
          <Wind className="w-6 h-6 text-teal-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-200">Synchronizing Environmental Intelligence...</p>
          <p className="text-xs text-slate-500 mt-1">Retrieving CAMS atmospheric models & weather prediction grids for {location.name}</p>
        </div>
      </div>
    );
  }

  const usAqi = airData?.current.usAqi ?? 50;
  const pm25 = airData?.current.pm2_5;
  const pm10 = airData?.current.pm10;
  const temp = weatherData?.current.temperature ?? 25;
  const humidity = weatherData?.current.relativeHumidity ?? 50;
  const windSpeed = weatherData?.current.windSpeed ?? 10;
  const windDir = weatherData?.current.windDirection ?? 0;
  const precip = weatherData?.current.precipitation ?? 0;

  // Active top alert if any
  const topAlert = alerts.length > 0 ? alerts[0] : null;

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">

      {/* Top Emergency / Official Bulletin Ribbon */}
      {topAlert && (
        <div className={`p-4 rounded-2xl border transition-all ${
          topAlert.severity === 'extreme'
            ? 'bg-red-500/15 border-red-500/40 text-red-200'
            : topAlert.severity === 'severe'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
              : 'bg-teal-500/15 border-teal-500/40 text-teal-200'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${
                topAlert.severity === 'extreme' ? 'text-red-400' : 'text-amber-400'
              }`} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm tracking-tight text-white">{topAlert.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                    topAlert.classification === 'OFFICIAL_GOVERNMENT_WARNING'
                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {topAlert.classification === 'OFFICIAL_GOVERNMENT_WARNING' ? 'Official IMD Warning' : 'Forecast Risk'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{topAlert.headline}</p>
                <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-2">
                  <span>Source: <strong>{topAlert.source}</strong></span>
                  <span>•</span>
                  <span>Issued: {new Date(topAlert.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onNavigateToAlerts}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700 shrink-0 flex items-center gap-1 cursor-pointer"
            >
              Action Plan <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Location Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-teal-400 mb-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>{location.adminRegion ? `${location.adminRegion}, ` : ''}{location.country || 'Global'}</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-slate-400">{location.latitude.toFixed(2)}°N, {location.longitude.toFixed(2)}°E</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {location.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Model sync: {airData?.lastUpdated ? new Date(airData.lastUpdated).toLocaleTimeString() : 'Recent'}</span>
              <span>•</span>
              <span className="text-teal-400/90 font-medium">
                {isDemoMode ? 'Simulated Demo Stream' : 'Open-Meteo Atmospheric Chemistry & Weather Model'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleToggleSave}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                isSaved 
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' 
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {savedSuccess ? (
                <Check className="w-3.5 h-3.5 text-teal-400" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
              <span>{isSaved ? 'Saved to Favorites' : 'Save Location'}</span>
            </button>

            <button
              onClick={onNavigateToAi}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI About This City</span>
            </button>

            <button
              onClick={onNavigateToMap}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
            >
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <span>View On Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: AQI Gauge + Weather Summary + AirAware Risk Intelligence + Mini Map */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Air Quality Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Wind className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Air Quality Index</h3>
                <p className="text-[11px] text-slate-400">US EPA Standard Model</p>
              </div>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
              usAqi <= 50 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
              usAqi <= 100 ? 'bg-lime-500/20 text-lime-300 border-lime-500/40' :
              usAqi <= 150 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
              usAqi <= 200 ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
              usAqi <= 300 ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
              'bg-rose-950 text-rose-300 border-rose-800'
            }`}>
              {riskReport?.airQualityRisk.category || (usAqi <= 50 ? 'Good' : usAqi <= 100 ? 'Moderate' : 'Unhealthy')}
            </span>
          </div>

          {/* Large AQI Display */}
          <div className="my-4 text-center">
            <div className="text-6xl font-black text-white tracking-tight font-mono">
              {usAqi}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">
              European AQI Estimate: <strong>{airData?.current.europeanAqi ?? 'N/A'}</strong>
            </div>

            {/* Scale Visualizer */}
            <div className="mt-4 w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
              <div className="h-full bg-emerald-500 flex-1" title="Good (0-50)" />
              <div className="h-full bg-lime-400 flex-1" title="Moderate (51-100)" />
              <div className="h-full bg-amber-400 flex-1" title="Sensitive (101-150)" />
              <div className="h-full bg-orange-500 flex-1" title="Unhealthy (151-200)" />
              <div className="h-full bg-purple-500 flex-1" title="Very Unhealthy (201-300)" />
              <div className="h-full bg-rose-700 flex-1" title="Hazardous (>300)" />
            </div>
          </div>

          {/* PM2.5 and PM10 metrics */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">PM2.5</div>
              <div className="text-lg font-bold text-white font-mono mt-0.5">
                {pm25 != null ? `${pm25} µg/m³` : 'N/A'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate" title={riskReport?.airQualityRisk.pm25VsWhoGuideline}>
                {pm25 != null ? `${(pm25 / 15).toFixed(1)}x WHO guideline` : 'Model estimate'}
              </div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">PM10</div>
              <div className="text-lg font-bold text-white font-mono mt-0.5">
                {pm10 != null ? `${pm10} µg/m³` : 'N/A'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate" title={riskReport?.airQualityRisk.pm10VsWhoGuideline}>
                {pm10 != null ? `${(pm10 / 45).toFixed(1)}x WHO guideline` : 'Coarse dust'}
              </div>
            </div>
          </div>
        </div>

        {/* Weather Conditions Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Weather & Climate</h3>
                <p className="text-[11px] text-slate-400">ECMWF Numerical Forecast</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
              {weatherData?.current.weatherCondition || 'Normal'}
            </span>
          </div>

          <div className="my-2 flex items-center justify-between">
            <div>
              <div className="text-5xl font-black text-white font-mono">
                {temp}°<span className="text-2xl text-slate-400">C</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Feels like <strong>{weatherData?.current.apparentTemperature ?? temp}°C</strong>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-slate-400">Thermal Comfort</div>
              <div className="text-sm font-bold text-teal-400">
                {riskReport?.weatherRisk.comfortSummary || 'Moderate'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Heat Index: {riskReport?.weatherRisk.heatIndexCelsius ?? temp}°C
              </div>
            </div>
          </div>

          {/* Micro weather indicators */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-center">
              <Droplets className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <div className="text-[10px] text-slate-400 uppercase">Humidity</div>
              <div className="text-xs font-bold text-white font-mono">{humidity}%</div>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-center">
              <Wind className="w-4 h-4 text-teal-400 mx-auto mb-1" />
              <div className="text-[10px] text-slate-400 uppercase">Wind</div>
              <div className="text-xs font-bold text-white font-mono">{windSpeed} km/h</div>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-center">
              <CloudRain className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="text-[10px] text-slate-400 uppercase">Rain</div>
              <div className="text-xs font-bold text-white font-mono">{precip} mm</div>
            </div>
          </div>
        </div>

        {/* The Signature Feature: AirAware Risk Intelligence */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-teal-500/30 rounded-3xl p-6 shadow-xl shadow-teal-500/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    AirAware Risk Intelligence
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 uppercase font-mono font-bold">
                      USP
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Rules-Based Multi-Vector Synthesis</p>
                </div>
              </div>
            </div>

            {/* Risk Category Badge & Score */}
            <div className="mt-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Local Environmental Status
                  </span>
                  <div className="text-lg font-black text-white mt-0.5" style={{ color: riskReport?.overallColor }}>
                    {riskReport?.summaryTitle || 'Evaluating Status...'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500">Risk Score</span>
                  <div className="text-xl font-mono font-black text-white">
                    {riskReport?.overallScore ?? 35}<span className="text-xs text-slate-500">/100</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {riskReport?.reasonForClassification || 'Analyzing atmospheric chemistry and local meteorological vectors.'}
              </p>
            </div>

            {/* Outdoor Activity Suitability Grid */}
            {riskReport && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <Footprints className="w-3.5 h-3.5 text-teal-400" /> Running
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    riskReport.activitySuitability.running.rating === 'good' ? 'bg-emerald-500/20 text-emerald-300' :
                    riskReport.activitySuitability.running.rating === 'caution' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {riskReport.activitySuitability.running.rating}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <Bike className="w-3.5 h-3.5 text-teal-400" /> Cycling
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    riskReport.activitySuitability.cycling.rating === 'good' ? 'bg-emerald-500/20 text-emerald-300' :
                    riskReport.activitySuitability.cycling.rating === 'caution' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {riskReport.activitySuitability.cycling.rating}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <Baby className="w-3.5 h-3.5 text-teal-400" /> Vulnerable
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    riskReport.activitySuitability.childrenElderly.rating === 'good' ? 'bg-emerald-500/20 text-emerald-300' :
                    riskReport.activitySuitability.childrenElderly.rating === 'caution' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {riskReport.activitySuitability.childrenElderly.rating}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <DoorOpen className="w-3.5 h-3.5 text-teal-400" /> Windows
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    riskReport.activitySuitability.ventilation.rating === 'open' ? 'bg-emerald-500/20 text-emerald-300' :
                    riskReport.activitySuitability.ventilation.rating === 'limited' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {riskReport.activitySuitability.ventilation.rating}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Mask Recommendation */}
          {riskReport && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-slate-200">
                {riskReport.activitySuitability.maskRecommendation.recommended ? 'N95 Respirator Recommended Outdoors' : 'Mask Not Required'}
              </span>
              <span className="text-[10px] text-teal-400 underline cursor-pointer" onClick={onNavigateToAi}>
                Ask Assistant
              </span>
            </div>
          )}
        </div>

        {/* Working Mini Leaflet Map Widget on Dashboard */}
        <DashboardMiniMap
          location={location}
          aqi={usAqi}
          onOpenFullMap={onNavigateToMap}
        />

      </div>

      {/* D3 Air Quality Index (AQI) 7-Day Historical Trends Chart Component */}
      <D3AqiTrendsChart
        data={airData?.sevenDayTrends || []}
        hourlyHistory={airData?.historyHourly}
        locationName={location.name}
      />

      {/* Detailed Chemical Pollutants Grid */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Atmospheric Chemical Pollutants</h3>
            <p className="text-xs text-slate-400">Continuous surface layer gaseous concentrations in µg/m³</p>
          </div>
          <span className="text-[11px] font-mono text-slate-500">CAMS Chemistry Model</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              name: 'Nitrogen Dioxide',
              formula: 'NO₂',
              val: airData?.current.nitrogenDioxide,
              unit: 'µg/m³',
              who: 'WHO 24h: 25 µg/m³',
              safe: (airData?.current.nitrogenDioxide ?? 0) < 25
            },
            {
              name: 'Ground Ozone',
              formula: 'O₃',
              val: airData?.current.ozone,
              unit: 'µg/m³',
              who: 'WHO 8h: 100 µg/m³',
              safe: (airData?.current.ozone ?? 0) < 100
            },
            {
              name: 'Carbon Monoxide',
              formula: 'CO',
              val: airData?.current.carbonMonoxide,
              unit: 'µg/m³',
              who: 'WHO 24h: 4000 µg/m³',
              safe: (airData?.current.carbonMonoxide ?? 0) < 4000
            },
            {
              name: 'Sulphur Dioxide',
              formula: 'SO₂',
              val: airData?.current.sulphurDioxide,
              unit: 'µg/m³',
              who: 'WHO 24h: 40 µg/m³',
              safe: (airData?.current.sulphurDioxide ?? 0) < 40
            },
            {
              name: 'Atmospheric Dust',
              formula: 'Dust',
              val: airData?.current.dust,
              unit: 'µg/m³',
              who: 'Aerosol load',
              safe: true
            },
            {
              name: 'Ultraviolet Index',
              formula: 'UV',
              val: airData?.current.uvIndex,
              unit: 'Index',
              who: 'Max solar intensity',
              safe: (airData?.current.uvIndex ?? 0) < 6
            }
          ].map(p => (
            <div key={p.formula} className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black font-mono text-teal-400">{p.formula}</span>
                <span className={`w-2 h-2 rounded-full ${p.safe ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </div>
              <div className="text-lg font-bold text-white font-mono mt-1">
                {p.val != null ? `${p.val}` : '—'} <span className="text-[10px] text-slate-500 font-normal">{p.unit}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 truncate">{p.name}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{p.who}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 24-Hour Trends Chart */}
      {airData?.hourly && airData.hourly.time.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-base font-bold text-white">24-Hour Environmental Timeline</h3>
              <p className="text-xs text-slate-400">Hourly atmospheric chemistry trajectory and dispersion dynamics</p>
            </div>
            
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
              <button
                onClick={() => setSelectedHourlyMetric('pm2_5')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  selectedHourlyMetric === 'pm2_5' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                PM2.5 (µg/m³)
              </button>
              <button
                onClick={() => setSelectedHourlyMetric('usAqi')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  selectedHourlyMetric === 'usAqi' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                US AQI
              </button>
              <button
                onClick={() => setSelectedHourlyMetric('temperature')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  selectedHourlyMetric === 'temperature' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Temperature (°C)
              </button>
            </div>
          </div>

          {/* SVG Trend Bar Visualization */}
          <div className="relative pt-4 pb-2">
            <div className="flex items-end gap-1.5 h-44 w-full overflow-x-auto pb-4">
              {airData.hourly.time.slice(0, 24).map((timeStr, idx) => {
                let val = 0;
                let maxRef = 200;
                let colorClass = 'bg-teal-500';

                if (selectedHourlyMetric === 'pm2_5') {
                  val = airData.hourly.pm2_5[idx] ?? 20;
                  maxRef = 250;
                  colorClass = val > 150 ? 'bg-purple-500' : val > 60 ? 'bg-red-500' : val > 35 ? 'bg-amber-500' : 'bg-teal-400';
                } else if (selectedHourlyMetric === 'usAqi') {
                  val = airData.hourly.usAqi[idx] ?? 50;
                  maxRef = 300;
                  colorClass = val > 200 ? 'bg-purple-500' : val > 150 ? 'bg-red-500' : val > 100 ? 'bg-amber-500' : 'bg-teal-400';
                } else {
                  val = weatherData?.hourly.temperature[idx] ?? 25;
                  maxRef = 50;
                  colorClass = val > 40 ? 'bg-red-500' : val > 30 ? 'bg-amber-400' : 'bg-cyan-400';
                }

                const heightPct = Math.min(100, Math.max(12, (val / maxRef) * 100));
                const hourFormatted = timeStr.includes('T') ? timeStr.split('T')[1]?.substring(0, 5) : timeStr;

                return (
                  <div key={idx} className="flex-1 min-w-[34px] flex flex-col items-center group relative cursor-pointer">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-slate-950 border border-slate-700 text-white text-[11px] font-mono px-2 py-0.5 rounded shadow pointer-events-none transition-opacity whitespace-nowrap z-20">
                      {val} {selectedHourlyMetric === 'temperature' ? '°C' : selectedHourlyMetric === 'pm2_5' ? 'µg/m³' : 'AQI'}
                    </div>

                    <div className="w-full h-36 flex items-end justify-center">
                      <div 
                        className={`w-full rounded-t-md transition-all duration-300 group-hover:brightness-125 ${colorClass}`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-2 font-mono">{hourFormatted}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5-Day Outlook */}
      {weatherData?.daily && weatherData.daily.time.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
          <h3 className="text-base font-bold text-white mb-1">5-Day Environmental Outlook</h3>
          <p className="text-xs text-slate-400 mb-4">Multi-day temperature bounds and precipitation probabilities</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {weatherData.daily.time.map((dayTime, idx) => {
              const maxT = weatherData.daily.temperatureMax[idx] ?? 30;
              const minT = weatherData.daily.temperatureMin[idx] ?? 20;
              const rainProb = weatherData.daily.precipitationProbabilityMax[idx] ?? 0;
              const dateObj = new Date(dayTime);
              const dayName = isNaN(dateObj.getTime()) ? dayTime : dateObj.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

              return (
                <div key={idx} className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-center">
                  <div className="text-xs font-semibold text-slate-300">{dayName}</div>
                  <div className="my-2 text-xl font-bold font-mono text-white">
                    {maxT}° <span className="text-xs text-slate-500 font-normal">/ {minT}°</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                    <CloudRain className="w-3 h-3 text-cyan-400" />
                    <span>{rainProb}% rain</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transparent Disclaimer & Attribution Footer */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-slate-400 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-teal-400 shrink-0" />
          <span>
            <strong>Data Disclosure:</strong> Air quality values are atmospheric model forecasts from Open-Meteo (Copernicus Atmosphere Service CAMS). They represent numerical grid predictions and are not official statutory ground-sensor measurements.
          </span>
        </div>
        <div className="text-[11px] text-slate-500 shrink-0">
          AirAware Engine v1.0.0
        </div>
      </div>

    </div>
  );
};
