import React, { useState } from 'react';
import { User as UserIcon, MapPin, Trash2, Settings, Shield, Globe, LogOut, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ProfileSettingsViewProps {
  onSelectLocation: (loc: { name: string; latitude: number; longitude: number; adminRegion?: string; country?: string }) => void;
  onNavigateToDashboard: () => void;
  onOpenAuth: () => void;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  onSelectLocation,
  onNavigateToDashboard,
  onOpenAuth
}) => {
  const { user, savedLocations, removeLocation, updateProfile, logout } = useAuth();
  const [preferredCity, setPreferredCity] = useState(user?.preferredCity || 'Gurugram');
  const [units, setUnits] = useState<'metric' | 'imperial'>(user?.units || 'metric');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <UserIcon className="w-12 h-12 text-teal-400 mx-auto" />
        <h3 className="text-xl font-bold text-white">Sign In to AirAware</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Create an account or sign in to save your preferred cities, configure persistent environmental thresholds, and receive verified climate emergency warnings.
        </p>
        <button
          onClick={onOpenAuth}
          className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({ preferredCity, units });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-teal-400" />
          Profile & Environmental Preferences
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage your default monitoring location, saved places, and platform settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* User Card */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-2xl flex items-center justify-center">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{user.name}</h3>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
            <div>Member since: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}</div>
            <div>Default City: <strong className="text-slate-300">{user.preferredCity}</strong></div>
          </div>
          <button
            onClick={logout}
            className="w-full py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Preferences Form */}
        <div className="md:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-400" />
            Regional & Monitoring Defaults
          </h4>

          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Default City on Launch
              </label>
              <input
                type="text"
                value={preferredCity}
                onChange={e => setPreferredCity(e.target.value)}
                placeholder="e.g. Gurugram"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Measurement Units
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUnits('metric')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    units === 'metric'
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Metric (°C, km/h, µg/m³)
                </button>
                <button
                  type="button"
                  onClick={() => setUnits('imperial')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    units === 'imperial'
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Imperial (°F, mph, µg/m³)
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="py-2 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{savedSuccess ? 'Preferences Saved!' : 'Save Preferences'}</span>
            </button>
          </form>

          {/* Saved Locations */}
          <div className="pt-6 border-t border-slate-800">
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-400" />
              Saved Favorite Locations ({savedLocations.length})
            </h4>

            {savedLocations.length > 0 ? (
              <div className="space-y-2">
                {savedLocations.map(loc => (
                  <div
                    key={loc.id}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{loc.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {[loc.adminRegion, loc.country].filter(Boolean).join(', ')} • {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onSelectLocation({
                            name: loc.name,
                            latitude: loc.latitude,
                            longitude: loc.longitude,
                            adminRegion: loc.adminRegion,
                            country: loc.country
                          });
                          onNavigateToDashboard();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 text-xs font-semibold"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => removeLocation(loc.id)}
                        className="p-1 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/40 text-center text-xs text-slate-500">
                No favorite locations saved yet. Click the bookmark icon on the dashboard to save any city!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
