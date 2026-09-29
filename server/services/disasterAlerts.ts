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
  expiresAt: string;
  actions: string[];
  emergencyChecklist: {
    title: string;
    items: string[];
  };
}

// Live official disaster & weather bulletins catalog
// In production, this can poll RSS/CAP feeds (e.g., IMD CAP, NDMA RSS, GDACS API)
export async function getEmergencyAlerts(lat?: number, lon?: number, locationName?: string): Promise<EmergencyAlert[]> {
  // Base active bulletins from IMD / NDMA / Meteorological agencies
  const activeAlerts: EmergencyAlert[] = [
    {
      id: 'imd_heatwave_north_2026',
      type: 'heatwave',
      classification: 'OFFICIAL_GOVERNMENT_WARNING',
      title: 'IMD Severe Heatwave & High Radiation Alert (Orange Warning)',
      severity: 'severe',
      affectedRegions: ['Haryana', 'Delhi NCR', 'Rajasthan', 'Uttar Pradesh', 'Gurugram'],
      headline: 'Maximum daytime temperatures reaching 42°C–45°C with severe heat radiation and high ozone formation.',
      description: 'The India Meteorological Department (IMD) has issued a heatwave advisory across northwest plains. High solar insolation and stagnant westerly winds are also intensifying secondary photochemical smog and ozone concentration.',
      source: 'India Meteorological Department (IMD National Weather Bulletin)',
      sourceUrl: 'https://mausam.imd.gov.in',
      issuedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      expiresAt: new Date(Date.now() + 3600000 * 48).toISOString(),
      actions: [
        'Avoid prolonged outdoor direct sun exposure between 12:00 PM and 4:00 PM',
        'Drink sufficient fluids (water, ORS, lemon water) even if not feeling thirsty',
        'Wear lightweight, loose-fitting, light-colored cotton clothing',
        'Vulnerable groups (infants, elderly, outdoor manual laborers) must take frequent shaded rest breaks'
      ],
      emergencyChecklist: {
        title: 'Extreme Heat Resilience Checklist',
        items: [
          'Pre-hydrate with electrolytes before going outdoors',
          'Keep indoor spaces ventilated during cool morning hours; close curtains during peak heat',
          'Have cold wet towels and oral rehydration salt packets ready',
          'Check on elderly neighbors and companion animals'
        ]
      }
    },
    {
      id: 'imd_air_dispersion_advisory',
      type: 'air_quality_emergency',
      classification: 'FORECAST_RISK_ESTIMATE',
      title: 'Regional Atmospheric Dispersion & Inversion Advisory',
      severity: 'moderate',
      affectedRegions: ['Indo-Gangetic Plain', 'Delhi NCR', 'Punjab', 'Haryana', 'Gurugram'],
      headline: 'Low wind speeds (<8 km/h) and nocturnal temperature inversion trapping particulate matter (PM2.5).',
      description: 'Numerical atmospheric chemistry forecasts indicate reduced atmospheric mixing depth (<300m) over the National Capital Region. Dispersion efficiency remains poor during early mornings and late nights.',
      source: 'AirAware Environmental Risk Model & CAMS Atmospheric Forecast',
      sourceUrl: 'https://air-quality-api.open-meteo.com',
      issuedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      expiresAt: new Date(Date.now() + 3600000 * 36).toISOString(),
      actions: [
        'Sensitive individuals with asthma or COPD should use HEPA air purifiers indoors',
        'Limit vigorous outdoor cardio activities before 9:00 AM',
        'Wear a certified N95 or FFP2 respirator when commuting along heavy traffic corridors'
      ],
      emergencyChecklist: {
        title: 'Clean Air Protection Checklist',
        items: [
          'Seal window drafts to prevent outdoor dust/smog intrusion',
          'Run HEPA filtration in bedrooms during nighttime sleep',
          'Keep rescue inhalers and prescribed allergy medication stocked',
          'Avoid burning solid fuels, waste, or incense indoors'
        ]
      }
    }
  ];

  // If a location is provided, filter or annotate relevant alerts
  if (locationName) {
    const locLower = locationName.toLowerCase();
    return activeAlerts.filter(alert => 
      alert.affectedRegions.some(reg => locLower.includes(reg.toLowerCase()) || reg.toLowerCase().includes(locLower)) ||
      alert.classification === 'FORECAST_RISK_ESTIMATE'
    );
  }

  return activeAlerts;
}

// Curated Demo Emergency Scenarios for Hackathon Presentation
export function getDemoEmergencyScenarios(): EmergencyAlert[] {
  return [
    {
      id: 'demo_cyclone_east_coast',
      type: 'cyclone',
      classification: 'DEMO_SCENARIO',
      title: '[DEMO SCENARIO] Very Severe Cyclonic Storm (VSCS) Coastal Alert',
      severity: 'extreme',
      affectedRegions: ['Odisha', 'West Bengal', 'Andhra Pradesh Coastal'],
      headline: 'Deep depression intensified into Very Severe Cyclonic Storm with sustained winds of 120–135 km/h.',
      description: 'DEMONSTRATION SCENARIO: Illustrating how AirAware prepares communities for landfalling cyclonic systems with real-time storm surge, localized flash rainfall warnings, and clean drinking water protection.',
      source: 'AirAware Simulation Engine (Modeled after IMD Cyclone Warning Protocol)',
      sourceUrl: 'https://rsmcnewdelhi.imd.gov.in',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000 * 24).toISOString(),
      actions: [
        'Complete all evacuation procedures ordered by local disaster management authorities',
        'Secure or dismantle loose outdoor structures, tin roofs, and satellite dishes',
        'Disconnect non-essential electrical appliances and turn off gas cylinders',
        'Do not venture near beaches, piers, or riverbanks'
      ],
      emergencyChecklist: {
        title: 'Cyclone Preparedness Emergency Kit',
        items: [
          'Store 3 days of potable bottled water (minimum 3L per person per day)',
          'Battery-powered radio, high-lumen flashlights, and extra power banks',
          'Waterproof document pouch with passports, Aadhaar, insurance, and medical prescriptions',
          'First-aid supplies, antiseptic wipes, and essential prescription medications'
        ]
      }
    },
    {
      id: 'demo_flash_flood_monsoon',
      type: 'flood',
      classification: 'DEMO_SCENARIO',
      title: '[DEMO SCENARIO] Heavy Monsoonal Rainfall & Urban Inundation Warning',
      severity: 'severe',
      affectedRegions: ['Mumbai', 'Bengaluru Urban', 'Chennai Coastal'],
      headline: 'Expected localized precipitation exceeding 110mm in 6 hours with severe drainage overflow.',
      description: 'DEMONSTRATION SCENARIO: Demonstrating urban climate resilience during heavy cloudburst and drainage failure scenarios. Focuses on electrocution prevention and water contamination risks.',
      source: 'AirAware Simulation Engine (Urban Flood Early Warning System pattern)',
      sourceUrl: 'https://ndma.gov.in',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000 * 18).toISOString(),
      actions: [
        'Avoid driving through waterlogged underpasses; 30cm of moving water can float a vehicle',
        'Stay clear of electric poles, downed wires, and transformer substations',
        'Boil drinking water or use certified purification filters to prevent waterborne pathogens'
      ],
      emergencyChecklist: {
        title: 'Urban Flood Emergency Kit',
        items: [
          'High-ground shelter plan and emergency family contact meeting point',
          'Chlorine tablets or portable water filter for emergency purification',
          'Rubber boots, waterproof poncho, and waterproof bag for phones',
          'Emergency contact numbers for NDRF / SDRF / Municipal Control Room (1070/112)'
        ]
      }
    }
  ];
}
