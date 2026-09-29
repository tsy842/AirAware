import React, { useState, useEffect, useRef } from 'react';
import { 
  Wind, 
  MapPin, 
  Search, 
  Bell, 
  Sparkles, 
  ShieldAlert, 
  User as UserIcon, 
  Compass, 
  Info, 
  Activity,
  Layers,
  ChevronDown,
  CheckCircle2,
  X,
  Globe2,
  Flame
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo, DEMO_SCENARIOS, DemoScenarioId } from '../contexts/DemoContext';
import { api } from '../services/api';
import { GeocodingPlace, AlertEvent } from '../types';

interface NavbarProps {
  currentLocation: {
    name: string;
    latitude: number;
    longitude: number;
    adminRegion?: string;
    country?: string;
  };
  onSelectLocation: (loc: { name: string; latitude: number; longitude: number; adminRegion?: string; country?: string }) => void;
  activeTab: 'dashboard' | 'map' | 'corridors' | 'alerts' | 'ai' | 'profile' | 'about';
  setActiveTab: (tab: 'dashboard' | 'map' | 'corridors' | 'alerts' | 'ai' | 'profile' | 'about') => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLocation,
  onSelectLocation,
  activeTab,
  setActiveTab,
  onOpenAuth
}) => {
  const { user, logout, token } = useAuth();
  const { isDemoMode, toggleDemoMode, demoScenario, setScenario, currentScenarioMeta } = useDemo();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);
  const [showDemoDropdown, setShowDemoDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Fetch unread alerts
  useEffect(() => {
    if (token) {
      api.getAlertEvents()
        .then(res => {
          const unread = res.events.filter(e => !e.isRead).length;
          setUnreadAlertsCount(unread);
        })
        .catch(() => {});
    }
  }, [token, activeTab]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.searchLocations(searchQuery);
        setSearchResults(res.results || []);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (demoRef.current && !demoRef.current.contains(e.target as Node)) {
        setShowDemoDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPlace = (place: GeocodingPlace) => {
    onSelectLocation({
      name: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      adminRegion: place.admin1,
      country: place.country
    });
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  const quickCities = [
    { name: 'Gurugram', lat: 28.4595, lon: 77.0266, state: 'Haryana', country: 'India' },
    { name: 'New Delhi', lat: 28.6139, lon: 77.2090, state: 'Delhi', country: 'India' },
    { name: 'Mumbai', lat: 19.0760, lon: 72.8777, state: 'Maharashtra', country: 'India' },
    { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, state: 'Karnataka', country: 'India' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 transition-all">
      {/* Top Banner if Demo Mode is Active */}
      {isDemoMode && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <span className="font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/30 border border-amber-500/50 uppercase text-[10px]">
              DEMO DATA ACTIVE
            </span>
            <span className="truncate">
              Currently presenting: <strong>{currentScenarioMeta.label}</strong> ({currentScenarioMeta.highlight})
            </span>
            <button 
              onClick={toggleDemoMode}
              className="ml-auto underline hover:text-amber-200 text-xs cursor-pointer font-medium"
            >
              Exit to Live Data
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Logo & Product Brand */}
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 via-emerald-500 to-cyan-400 p-0.5 shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/40 transition-all">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Wind className="w-5 h-5 text-teal-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Air<span className="text-teal-400">Aware</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800/60">
                  Resilience
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block tracking-wide">
                Breathe Smarter. Stay Safer.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div ref={searchRef} className="relative flex-1 max-w-md hidden md:block">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search city, district, or coordinates (e.g. Gurugram, Mumbai)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
                className="w-full bg-slate-900/90 hover:bg-slate-900 text-sm text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-9 py-2 border border-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            {showSearchDropdown && (
              <div className="absolute top-full mt-2 w-full bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl py-2 z-50 max-h-80 overflow-y-auto">
                {isSearching ? (
                  <div className="px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    Searching Open-Meteo global places database...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div>
                    <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Locations
                    </div>
                    {searchResults.map(place => (
                      <div
                        key={place.id}
                        onClick={() => handleSelectPlace(place)}
                        className="px-3.5 py-2.5 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <MapPin className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                          <div>
                            <div className="text-sm font-medium text-slate-200 group-hover:text-white">
                              {place.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {[place.admin1, place.country].filter(Boolean).join(', ')}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">
                          {place.latitude.toFixed(2)}°, {place.longitude.toFixed(2)}°
                        </span>
                      </div>
                    ))}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <div className="px-4 py-3 text-xs text-slate-400">
                    No matching locations found for "{searchQuery}".
                  </div>
                ) : null}

                {/* Quick Presets inside dropdown */}
                <div className="border-t border-slate-800/80 mt-1 pt-1.5">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Quick Presets
                  </div>
                  <div className="grid grid-cols-2 gap-1 px-2">
                    {quickCities.map(city => (
                      <button
                        key={city.name}
                        onClick={() => {
                          onSelectLocation({
                            name: city.name,
                            latitude: city.lat,
                            longitude: city.lon,
                            adminRegion: city.state,
                            country: city.country
                          });
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                        className="text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5"
                      >
                        <MapPin className="w-3 h-3 text-teal-400" />
                        <span>{city.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'map'
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Explore Map</span>
            </button>

            <button
              onClick={() => setActiveTab('corridors')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'corridors'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900'
              }`}
            >
              <Globe2 className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">BRICS Hub</span>
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'alerts'
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span className="hidden sm:inline">Alerts</span>
              {unreadAlertsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white font-bold text-[9px] flex items-center justify-center">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'ai'
                  ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">AI Advisor</span>
            </button>
          </nav>

          {/* Right Controls: Demo Mode Switcher & User Profile */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Demo Mode Toggle & Scenarios Dropdown */}
            <div ref={demoRef} className="relative">
              <button
                onClick={() => setShowDemoDropdown(prev => !prev)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  isDemoMode 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20' 
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isDemoMode ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                <span className="hidden lg:inline">{isDemoMode ? 'Demo Mode' : 'Live Data'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showDemoDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2.5 z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-xs font-semibold text-slate-200">Data Presentation Mode</span>
                    <button
                      onClick={() => {
                        toggleDemoMode();
                        setShowDemoDropdown(false);
                      }}
                      className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                        isDemoMode
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isDemoMode ? 'Turn OFF' : 'Turn ON'}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                    Demo Mode loads verified presentation scenarios for judges without requiring external API quotas.
                  </p>

                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-1">
                      Judge Demo Scenarios
                    </div>
                    {DEMO_SCENARIOS.map(scenario => (
                      <button
                        key={scenario.id}
                        onClick={() => {
                          setScenario(scenario.id);
                          if (!isDemoMode) toggleDemoMode();
                          onSelectLocation({
                            name: scenario.locationName.split(',')[0],
                            latitude: scenario.latitude,
                            longitude: scenario.longitude,
                            adminRegion: scenario.locationName.split(',')[1]?.trim(),
                            country: 'India'
                          });
                          setShowDemoDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-start justify-between ${
                          isDemoMode && demoScenario === scenario.id
                            ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{scenario.label}</div>
                          <div className="text-[11px] text-slate-400">{scenario.locationName}</div>
                        </div>
                        {isDemoMode && demoScenario === scenario.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile or Login Trigger */}
            <div ref={profileRef} className="relative">
              {user ? (
                <div>
                  <button
                    onClick={() => setShowProfileMenu(prev => !prev)}
                    className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center font-bold text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-slate-200 font-medium hidden md:inline max-w-[100px] truncate">
                      {user.name}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50">
                      <div className="px-3.5 py-2 border-b border-slate-800">
                        <div className="text-xs font-semibold text-white">{user.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab('profile');
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        Profile & Saved Locations
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('about');
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                      >
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                        Data Sources & Methodology
                      </button>
                      <div className="border-t border-slate-800 my-1" />
                      <button
                        onClick={() => {
                          logout();
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-red-400 hover:bg-slate-800"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-teal-500/20 cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
