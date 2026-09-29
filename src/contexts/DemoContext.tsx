import React, { createContext, useContext, useState } from 'react';

export type DemoScenarioId = 'gurugram_smog' | 'cyclone_alert' | 'extreme_heatwave' | 'mountain_clean';

export interface DemoScenarioOption {
  id: DemoScenarioId;
  label: string;
  locationName: string;
  latitude: number;
  longitude: number;
  highlight: string;
}

export const DEMO_SCENARIOS: DemoScenarioOption[] = [
  {
    id: 'gurugram_smog',
    label: 'Gurugram Severe Winter Smog',
    locationName: 'Gurugram, Haryana',
    latitude: 28.4595,
    longitude: 77.0266,
    highlight: 'Elevated AQI (265), PM2.5 (148 µg/m³), N95 mask recommendation'
  },
  {
    id: 'cyclone_alert',
    label: 'East Coast Cyclone Emergency',
    locationName: 'Puri, Odisha',
    latitude: 19.8135,
    longitude: 85.8312,
    highlight: 'Category-4 winds (95–125 km/h), storm surge & preparedness checklist'
  },
  {
    id: 'extreme_heatwave',
    label: 'North India Extreme Heatwave',
    locationName: 'Jaipur, Rajasthan',
    latitude: 26.9124,
    longitude: 75.7873,
    highlight: 'Ambient 44.2°C, heat index 49°C, extreme UV & ozone radiation'
  },
  {
    id: 'mountain_clean',
    label: 'Clean Mountain Baseline',
    locationName: 'Shimla, Himachal Pradesh',
    latitude: 31.1048,
    longitude: 77.1734,
    highlight: 'Pristine AQI (28), PM2.5 (7 µg/m³), optimal outdoor cardio'
  }
];

interface DemoContextType {
  isDemoMode: boolean;
  demoScenario: DemoScenarioId;
  toggleDemoMode: () => void;
  setDemoMode: (active: boolean) => void;
  setScenario: (scenario: DemoScenarioId) => void;
  currentScenarioMeta: DemoScenarioOption;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoScenario, setDemoScenario] = useState<DemoScenarioId>('gurugram_smog');

  const toggleDemoMode = () => setIsDemoMode(prev => !prev);
  const setDemoMode = (active: boolean) => setIsDemoMode(active);
  const setScenario = (s: DemoScenarioId) => setDemoScenario(s);

  const currentScenarioMeta = DEMO_SCENARIOS.find(s => s.id === demoScenario) || DEMO_SCENARIOS[0];

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        demoScenario,
        toggleDemoMode,
        setDemoMode,
        setScenario,
        currentScenarioMeta
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
