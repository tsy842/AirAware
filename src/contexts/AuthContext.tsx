import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, SavedLocation } from '../types';
import { api, setApiToken, getApiToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  savedLocations: SavedLocation[];
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  addLocation: (loc: { name: string; latitude: number; longitude: number; adminRegion?: string; country?: string }) => Promise<void>;
  removeLocation: (id: string) => Promise<void>;
  refreshSavedLocations: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getApiToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);

  useEffect(() => {
    async function loadInitialUser() {
      const storedToken = getApiToken();
      if (storedToken) {
        try {
          const res = await api.getProfile();
          setUser(res.user);
          const locRes = await api.getSavedLocations();
          setSavedLocations(locRes.locations || []);
        } catch (err) {
          console.warn('Failed to restore user session:', err);
          setApiToken(null);
          setTokenState(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    }
    loadInitialUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    setApiToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    const locRes = await api.getSavedLocations();
    setSavedLocations(locRes.locations || []);
  };

  const register = async (name: string, email: string, pass: string) => {
    const res = await api.register(name, email, pass);
    setApiToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    const locRes = await api.getSavedLocations();
    setSavedLocations(locRes.locations || []);
  };

  const logout = () => {
    setApiToken(null);
    setTokenState(null);
    setUser(null);
    setSavedLocations([]);
  };

  const updateProfile = async (updates: Partial<User>) => {
    const res = await api.updateProfile(updates);
    setUser(res.user);
  };

  const refreshSavedLocations = async () => {
    if (!token) return;
    try {
      const locRes = await api.getSavedLocations();
      setSavedLocations(locRes.locations || []);
    } catch (err) {
      console.error('Failed to load saved locations:', err);
    }
  };

  const addLocation = async (loc: { name: string; latitude: number; longitude: number; adminRegion?: string; country?: string }) => {
    const res = await api.addSavedLocation(loc);
    setSavedLocations(prev => [...prev, res.location]);
  };

  const removeLocation = async (id: string) => {
    await api.deleteSavedLocation(id);
    setSavedLocations(prev => prev.filter(l => l.id !== id));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        savedLocations,
        login,
        register,
        logout,
        updateProfile,
        addLocation,
        removeLocation,
        refreshSavedLocations
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
