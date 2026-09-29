import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DemoProvider, useDemo } from './contexts/DemoContext';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { MapView } from './components/MapView';
import { BricsCorridorsView } from './components/BricsCorridorsView';
import { AlertsCenterView } from './components/AlertsCenterView';
import { AiAssistantView } from './components/AiAssistantView';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { AboutSourcesView } from './components/AboutSourcesView';
import { AuthModal } from './components/AuthModal';
import { api, getDemoModeData } from './services/api';
import { AirQualityData, WeatherData, RiskIntelligenceReport, EmergencyAlert } from './types';
import { Wind, Heart } from 'lucide-react';

function AppContent() {
  const { user } = useAuth();
  const { isDemoMode, demoScenario } = useDemo();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'map' | 'corridors' | 'alerts' | 'ai' | 'profile' | 'about'>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Active Location state
  const [location, setLocation] = useState<{
    name: string;
    latitude: number;
    longitude: number;
    adminRegion?: string;
    country?: string;
  }>({
    name: 'Gurugram',
    latitude: 28.4595,
    longitude: 77.0266,
    adminRegion: 'Haryana',
    country: 'India'
  });

  // Environmental readings state
  const [airData, setAirData] = useState<AirQualityData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [riskReport, setRiskReport] = useState<RiskIntelligenceReport | null>(null);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // If user has a preferred city on login, sync it; otherwise auto-detect real location
  useEffect(() => {
    if (user && user.preferredCity && user.preferredLat && user.preferredLon) {
      setLocation({
        name: user.preferredCity,
        latitude: user.preferredLat,
        longitude: user.preferredLon,
        country: 'India'
      });
      return;
    }

    let isMounted = true;
    api.detectUserLocation().then(detected => {
      if (isMounted && !user?.preferredCity) {
        setLocation({
          name: detected.name,
          latitude: detected.latitude,
          longitude: detected.longitude,
          adminRegion: detected.adminRegion,
          country: detected.country
        });
      }
    }).catch(err => {
      console.warn('Initial location auto-detection error:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [user?.preferredCity]);

  // Load live or demo environmental readings
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setIsLoading(true);

      // 1. If Demo Mode is active, load curated mock data
      if (isDemoMode) {
        const demoData = getDemoModeData(demoScenario);
        setAirData(demoData.air);
        setWeatherData(demoData.weather);
        setRiskReport(demoData.risk);
        setAlerts(demoData.alerts);
        setIsLoading(false);
        return;
      }

      // 2. Real Live Mode: Fetch from backend Open-Meteo & IMD APIs
      try {
        const [airRes, weatherRes, riskRes, alertsRes] = await Promise.all([
          api.getAirQuality(location.latitude, location.longitude),
          api.getWeather(location.latitude, location.longitude),
          api.getRiskReport(location.latitude, location.longitude),
          api.getEmergencyAlerts(location.latitude, location.longitude, location.name)
        ]);

        if (!isCancelled) {
          setAirData(airRes);
          setWeatherData(weatherRes);
          setRiskReport(riskRes);
          setAlerts(alertsRes.alerts || []);
        }
      } catch (err) {
        console.error('Failed to load real environmental data:', err);
        // Fallback to demo mode structure if network down
        if (!isCancelled) {
          const fallback = getDemoModeData('gurugram_smog');
          setAirData(fallback.air);
          setWeatherData(fallback.weather);
          setRiskReport(fallback.risk);
          setAlerts(fallback.alerts);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [location.latitude, location.longitude, isDemoMode, demoScenario]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        currentLocation={location}
        onSelectLocation={loc => setLocation(loc)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            location={location}
            airData={airData}
            weatherData={weatherData}
            riskReport={riskReport}
            alerts={alerts}
            isLoading={isLoading}
            onNavigateToAi={() => setActiveTab('ai')}
            onNavigateToAlerts={() => setActiveTab('alerts')}
            onNavigateToMap={() => setActiveTab('map')}
          />
        )}

        {activeTab === 'map' && (
          <MapView
            currentLocation={location}
            onSelectLocation={loc => setLocation(loc)}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'corridors' && (
          <BricsCorridorsView
            onSelectCoordinates={coords => {
              setLocation(coords);
              setActiveTab('dashboard');
            }}
            onNavigateToMap={() => setActiveTab('map')}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsCenterView
            currentLocation={location}
            alerts={alerts}
          />
        )}

        {activeTab === 'ai' && (
          <AiAssistantView
            location={location}
            airData={airData}
            weatherData={weatherData}
            riskReport={riskReport}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileSettingsView
            onSelectLocation={loc => setLocation(loc)}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'about' && (
          <AboutSourcesView />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/90 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-teal-400" />
            <span className="font-bold text-slate-300">AirAware Platform</span>
            <span>— Hack2Skill Track 2: Clean Air & Climate Resilience</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button onClick={() => setActiveTab('dashboard')} className="hover:text-white">Dashboard</button>
            <button onClick={() => setActiveTab('map')} className="hover:text-white">Map</button>
            <button onClick={() => setActiveTab('corridors')} className="hover:text-white">BRICS Hub</button>
            <button onClick={() => setActiveTab('alerts')} className="hover:text-white">Alerts</button>
            <button onClick={() => setActiveTab('ai')} className="hover:text-white">AI Assistant</button>
            <button onClick={() => setActiveTab('about')} className="hover:text-white">Methodology</button>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DemoProvider>
        <AppContent />
      </DemoProvider>
    </AuthProvider>
  );
}
