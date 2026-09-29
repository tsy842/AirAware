import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'airaware.json');

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  preferredCity?: string;
  preferredLat?: number;
  preferredLon?: number;
  units?: 'metric' | 'imperial';
}

export interface SavedLocation {
  id: string;
  userId: string;
  name: string;
  adminRegion?: string;
  country?: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface AlertRule {
  id: string;
  userId: string;
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
  userId: string;
  alertRuleId?: string;
  locationName: string;
  eventType: 'aqi_exceeded' | 'pm25_exceeded' | 'heatwave_warning' | 'heavy_rain_warning' | 'official_bulletin' | 'cyclone_alert' | 'transboundary_smog_plume';
  severity: 'low' | 'moderate' | 'high' | 'severe' | 'emergency';
  title: string;
  message: string;
  source: string;
  sourceUrl?: string;
  isRead: boolean;
  createdAt: string;
}

// BRICS Federated Intelligence Models
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

interface DatabaseSchema {
  users: User[];
  savedLocations: SavedLocation[];
  alertRules: AlertRule[];
  alertEvents: AlertEvent[];
  citizenReports: CitizenReport[];
  corridorHotspots: CorridorHotspot[];
  bricsCorridors: BRICSCorridor[];
  federatedNodes: FederatedNode[];
}

let db: DatabaseSchema = {
  users: [],
  savedLocations: [],
  alertRules: [],
  alertEvents: [],
  citizenReports: [],
  corridorHotspots: [],
  bricsCorridors: [],
  federatedNodes: []
};

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function initDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(data);
      // Ensure new arrays exist in case of schema migration
      if (!db.citizenReports) db.citizenReports = [];
      if (!db.corridorHotspots) db.corridorHotspots = [];
      if (!db.bricsCorridors || db.bricsCorridors.length === 0) seedBricsData();
      if (!db.federatedNodes || db.federatedNodes.length === 0) seedFederatedNodes();
    } else {
      seedDefaultData();
      saveDb();
    }
  } catch (error) {
    console.error('Error initializing database, seeding fresh state:', error);
    seedDefaultData();
    saveDb();
  }
}

function saveDb() {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

function seedBricsData() {
  db.bricsCorridors = [
    {
      id: 'corridor_indo_gangetic',
      name: 'Indo-Gangetic Plain & Punjab Agricultural Belt',
      memberStates: ['India', 'Cross-border (Pakistan/Punjab)'],
      economicHubs: ['National Capital Region (Delhi)', 'Gurugram', 'Amritsar', 'Ludhiana', 'Lahore'],
      primaryPollutionDrivers: ['Seasonal Post-Harvest Stubble Burning (Rice/Wheat)', 'Brick Kilns', 'Low Mixing Height Inversions'],
      transboundaryRiskLevel: 'critical',
      currentAvgAqi: 284,
      activeHotspotCount: 142,
      leadAgency: 'CPCB (Central Pollution Control Board, India) & Commission for Air Quality Management (CAQM)',
      centerCoordinates: { lat: 29.5, lon: 76.5 },
      description: 'North-westerly winds consistently transport post-harvest agricultural burning plumes across Punjab and Haryana into Delhi NCR and Western UP, creating severe trans-boundary smog episodes affecting 80 million people.'
    },
    {
      id: 'corridor_yangtze_delta',
      name: 'Yangtze River Delta Industrial & Maritime Corridor',
      memberStates: ['China'],
      economicHubs: ['Shanghai', 'Suzhou', 'Wuxi', 'Ningbo', 'Hangzhou'],
      primaryPollutionDrivers: ['Heavy Steel Metallurgy', 'Petrochemical Processing', 'High-Density Container Shipping'],
      transboundaryRiskLevel: 'elevated',
      currentAvgAqi: 138,
      activeHotspotCount: 46,
      leadAgency: 'Ministry of Ecology and Environment (MEE, China)',
      centerCoordinates: { lat: 31.23, lon: 121.47 },
      description: 'Inter-provincial industrial emissions corridor subject to atmospheric recirculation between marine air masses and continental industrial smog.'
    },
    {
      id: 'corridor_sao_paulo_santos',
      name: 'São Paulo - Santos Petrochemical & Biomass Corridor',
      memberStates: ['Brazil'],
      economicHubs: ['São Paulo Metro', 'Cubatão Industrial Pole', 'Port of Santos', 'Campinas'],
      primaryPollutionDrivers: ['Sugar Cane Harvest Thermal Burning', 'Cubatão Fertilizer/Refinery Stacks', 'Diesel Freight Traffic'],
      transboundaryRiskLevel: 'elevated',
      currentAvgAqi: 112,
      activeHotspotCount: 29,
      leadAgency: 'CETESB (Environmental Company of the State of São Paulo, Brazil) & INPE',
      centerCoordinates: { lat: -23.55, lon: -46.63 },
      description: 'Mountain-valley thermal inversions trap chemical emissions between the Serra do Mar escarpment and urban centers.'
    },
    {
      id: 'corridor_highveld_coal',
      name: 'Highveld & Mpumalanga Coal Power Belt',
      memberStates: ['South Africa'],
      economicHubs: ['Johannesburg', 'Pretoria', 'eMalahleni (Witbank)', 'Secunda'],
      primaryPollutionDrivers: ['Coal-Fired Power Utility Emissions (SO2/NOx)', 'Synthetic Fuel Production', 'Open-Cast Mine Dust'],
      transboundaryRiskLevel: 'severe',
      currentAvgAqi: 176,
      activeHotspotCount: 68,
      leadAgency: 'Department of Forestry, Fisheries and the Environment (DFFE, South Africa)',
      centerCoordinates: { lat: -26.0, lon: 29.2 },
      description: 'World highest density of coal power stations causing trans-provincial nitrogen dioxide and particulate blankets over Gauteng province.'
    },
    {
      id: 'corridor_arabian_gulf',
      name: 'Arabian Gulf Petrochemical & Dust Corridor',
      memberStates: ['United Arab Emirates', 'Cross-Gulf'],
      economicHubs: ['Dubai', 'Abu Dhabi', 'Ruwais', 'Sharjah'],
      primaryPollutionDrivers: ['Mineral Dust Storms (Shamal)', 'Petrochemical Desalination Emissions', 'Extreme Thermal Smog'],
      transboundaryRiskLevel: 'severe',
      currentAvgAqi: 164,
      activeHotspotCount: 38,
      leadAgency: 'Environment Agency – Abu Dhabi (EAD) & UAE Ministry of Climate Change',
      centerCoordinates: { lat: 24.45, lon: 54.37 },
      description: 'Shamal winds blow mineral aerosols across the Arabian Gulf, interacting with coastal refinery emissions.'
    }
  ];

  db.corridorHotspots = [
    {
      id: 'hotspot_crop_01',
      corridorId: 'corridor_indo_gangetic',
      corridorName: 'Indo-Gangetic Plain & Punjab Agricultural Belt',
      country: 'India',
      region: 'Sangrur, Punjab',
      latitude: 30.245,
      longitude: 75.842,
      hotspotType: 'crop_burning',
      satelliteSource: 'VIIRS Suomi-NPP 375m',
      thermalRadiativePowerMW: 48.6,
      estimatedPm25FluxKgPerHour: 840,
      windTrajectoryVector: {
        bearingDeg: 125,
        speedKmh: 14.5,
        downstreamImpact: 'Trans-boundary transport toward Karnal, Panipat, and Delhi NCR within 6–10 hours.'
      },
      detectedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'hotspot_crop_02',
      corridorId: 'corridor_indo_gangetic',
      corridorName: 'Indo-Gangetic Plain & Punjab Agricultural Belt',
      country: 'India',
      region: 'Fatehabad, Haryana',
      latitude: 29.516,
      longitude: 75.452,
      hotspotType: 'crop_burning',
      satelliteSource: 'Sentinel-5P TROPOMI',
      thermalRadiativePowerMW: 32.1,
      estimatedPm25FluxKgPerHour: 520,
      windTrajectoryVector: {
        bearingDeg: 118,
        speedKmh: 12.0,
        downstreamImpact: 'South-east dispersion directly tracking toward Gurugram and South Delhi.'
      },
      detectedAt: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: 'hotspot_ind_03',
      corridorId: 'corridor_indo_gangetic',
      corridorName: 'Indo-Gangetic Plain & Punjab Agricultural Belt',
      country: 'India',
      region: 'Manesar Industrial Area, Gurugram',
      latitude: 28.358,
      longitude: 76.942,
      hotspotType: 'industrial_smelter',
      satelliteSource: 'VIIRS Suomi-NPP 375m',
      thermalRadiativePowerMW: 18.4,
      estimatedPm25FluxKgPerHour: 280,
      windTrajectoryVector: {
        bearingDeg: 90,
        speedKmh: 8.2,
        downstreamImpact: 'Localized stagnant concentration along NH-48 logistics belt.'
      },
      detectedAt: new Date(Date.now() - 3600000 * 1).toISOString()
    },
    {
      id: 'hotspot_sa_01',
      corridorId: 'corridor_highveld_coal',
      corridorName: 'Highveld & Mpumalanga Coal Power Belt',
      country: 'South Africa',
      region: 'eMalahleni / Kendal Station',
      latitude: -26.09,
      longitude: 28.97,
      hotspotType: 'coal_fired_power',
      satelliteSource: 'Sentinel-5P TROPOMI',
      thermalRadiativePowerMW: 85.0,
      estimatedPm25FluxKgPerHour: 1450,
      windTrajectoryVector: {
        bearingDeg: 275,
        speedKmh: 16.0,
        downstreamImpact: 'High-altitude SO2/NOx plume sweeping west into Johannesburg metropolitan basin.'
      },
      detectedAt: new Date(Date.now() - 3600000 * 3).toISOString()
    }
  ];

  db.citizenReports = [
    {
      id: 'cit_rep_01',
      userId: 'usr_demo_gurugram_01',
      reporterName: 'Community Clean Air Scout (Gurugram Sec-49)',
      locationName: 'Sohna Road Corridor, Gurugram',
      latitude: 28.412,
      longitude: 77.045,
      emissionType: 'waste_incineration',
      description: 'Heavy toxic black smoke billowing from illegal open municipal plastic & dry waste burning behind warehouse complex.',
      estimatedSeverity: 'severe',
      aiAnalysis: {
        plumeClassification: 'High-Temperature Hydrocarbon / Polymer Smolder',
        opticalOpacityPercent: 88,
        estimatedPm25Contribution: 165,
        healthAdvisory: 'Acute respiratory irritant. High concentration of toxic dioxins and ultrafine soot. Immediate mask seal needed.',
        confidence: 0.94
      },
      upvotes: 24,
      status: 'authority_dispatched',
      assignedAuthority: 'Haryana State Pollution Control Board (HSPCB) Flying Squad #4',
      corridorId: 'corridor_indo_gangetic',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 'cit_rep_02',
      userId: 'usr_demo_gurugram_01',
      reporterName: 'Farmer Collective Monitor (Karnal)',
      locationName: 'Indri-Karnal Rural Belt',
      latitude: 29.805,
      longitude: 77.062,
      emissionType: 'agricultural_burning',
      description: 'Paddy residue thermal fire across 4 adjoining farm plots following harvester combine pass.',
      estimatedSeverity: 'high',
      aiAnalysis: {
        plumeClassification: 'Cellulosic Biomass Combustion',
        opticalOpacityPercent: 72,
        estimatedPm25Contribution: 120,
        healthAdvisory: 'Heavy organic carbon and potassium aerosols. Downwind dispersion towards urban centers.',
        confidence: 0.91
      },
      upvotes: 18,
      status: 'satellite_verified',
      assignedAuthority: 'District Agriculture Task Force & CAQM Nodal Officer',
      corridorId: 'corridor_indo_gangetic',
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
    }
  ];
}

function seedFederatedNodes() {
  db.federatedNodes = [
    {
      id: 'node_india_cpcb',
      country: 'India',
      agency: 'CPCB / CAQM National Central Node',
      nodeUrl: 'https://cpcb.nic.in/federated/api/v2',
      status: 'online',
      sharedModel: 'BRICS-AeroTransport-IndoGangetic-v4.2',
      lastSync: new Date().toISOString(),
      dataVectorsExchanged24h: 18450
    },
    {
      id: 'node_brazil_inpe',
      country: 'Brazil',
      agency: 'INPE Satellite Remote Sensing Center',
      nodeUrl: 'https://queimadas.dgi.inpe.br/federated',
      status: 'online',
      sharedModel: 'BRICS-BiomassFire-SouthAmerica-v3.1',
      lastSync: new Date(Date.now() - 120000).toISOString(),
      dataVectorsExchanged24h: 14200
    },
    {
      id: 'node_south_africa_saws',
      country: 'South Africa',
      agency: 'South African Weather Service (SAWS)',
      nodeUrl: 'https://airquality.environment.gov.za/federated',
      status: 'online',
      sharedModel: 'BRICS-Highveld-CoalDispersion-v2.8',
      lastSync: new Date(Date.now() - 240000).toISOString(),
      dataVectorsExchanged24h: 9600
    },
    {
      id: 'node_china_cnemc',
      country: 'China',
      agency: 'China National Environmental Monitoring Centre (CNEMC)',
      nodeUrl: 'https://cnemc.cn/federated/corridor',
      status: 'online',
      sharedModel: 'BRICS-IndustrialPlumeForecast-v5.0',
      lastSync: new Date(Date.now() - 60000).toISOString(),
      dataVectorsExchanged24h: 32100
    },
    {
      id: 'node_uae_ead',
      country: 'United Arab Emirates',
      agency: 'Environment Agency – Abu Dhabi (EAD)',
      nodeUrl: 'https://ead.gov.ae/climate/federated',
      status: 'online',
      sharedModel: 'BRICS-DustPhotochemical-Gulf-v2.0',
      lastSync: new Date(Date.now() - 180000).toISOString(),
      dataVectorsExchanged24h: 11400
    }
  ];
}

function seedDefaultData() {
  const salt = bcrypt.genSaltSync(10);
  const demoPasswordHash = bcrypt.hashSync('AirAware2026!', salt);

  const demoUserId = 'usr_demo_gurugram_01';
  db.users = [
    {
      id: demoUserId,
      name: 'Dr. Tarun Yadav',
      email: 'demo@airaware.org',
      passwordHash: demoPasswordHash,
      createdAt: new Date().toISOString(),
      preferredCity: 'Gurugram',
      preferredLat: 28.4595,
      preferredLon: 77.0266,
      units: 'metric'
    }
  ];

  db.savedLocations = [
    {
      id: 'loc_gurugram',
      userId: demoUserId,
      name: 'Gurugram',
      adminRegion: 'Haryana',
      country: 'India',
      latitude: 28.4595,
      longitude: 77.0266,
      createdAt: new Date().toISOString()
    },
    {
      id: 'loc_delhi',
      userId: demoUserId,
      name: 'New Delhi',
      adminRegion: 'Delhi',
      country: 'India',
      latitude: 28.6139,
      longitude: 77.2090,
      createdAt: new Date().toISOString()
    },
    {
      id: 'loc_bengaluru',
      userId: demoUserId,
      name: 'Bengaluru',
      adminRegion: 'Karnataka',
      country: 'India',
      latitude: 12.9716,
      longitude: 77.5946,
      createdAt: new Date().toISOString()
    }
  ];

  db.alertRules = [
    {
      id: 'rule_aqi_gurugram',
      userId: demoUserId,
      locationName: 'Gurugram',
      latitude: 28.4595,
      longitude: 77.0266,
      alertType: 'aqi',
      threshold: 150,
      comparison: 'above',
      enabled: true,
      lastEvaluatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  ];

  db.alertEvents = [
    {
      id: 'evt_init_1',
      userId: demoUserId,
      alertRuleId: 'rule_aqi_gurugram',
      locationName: 'Gurugram',
      eventType: 'transboundary_smog_plume',
      severity: 'severe',
      title: 'Trans-Boundary Agricultural Smog Entering Gurugram',
      message: 'Satellite remote sensing (VIIRS 375m) and north-westerly wind vectors indicate incoming biomass smoke plume originating from Punjab farm clusters. Ambient PM2.5 expected to spike +80 µg/m³.',
      source: 'AirAware BRICS Federated Corridor Intelligence',
      sourceUrl: 'https://cpcb.nic.in',
      isRead: false,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ];

  seedBricsData();
  seedFederatedNodes();
}

// User CRUD
export const dbUsers = {
  findByEmail(email: string): User | undefined {
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  findById(id: string): User | undefined {
    return db.users.find(u => u.id === id);
  },
  create(user: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...user,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    saveDb();
    return newUser;
  },
  update(id: string, updates: Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>>): User | undefined {
    const user = db.users.find(u => u.id === id);
    if (!user) return undefined;
    Object.assign(user, updates);
    saveDb();
    return user;
  }
};

// Saved Locations CRUD
export const dbSavedLocations = {
  findByUserId(userId: string): SavedLocation[] {
    return db.savedLocations.filter(loc => loc.userId === userId);
  },
  create(loc: Omit<SavedLocation, 'id' | 'createdAt'>): SavedLocation {
    const newLoc: SavedLocation = {
      ...loc,
      id: `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    };
    db.savedLocations.push(newLoc);
    saveDb();
    return newLoc;
  },
  delete(id: string, userId: string): boolean {
    const idx = db.savedLocations.findIndex(l => l.id === id && l.userId === userId);
    if (idx !== -1) {
      db.savedLocations.splice(idx, 1);
      saveDb();
      return true;
    }
    return false;
  }
};

// Alert Rules CRUD
export const dbAlertRules = {
  findByUserId(userId: string): AlertRule[] {
    return db.alertRules.filter(r => r.userId === userId);
  },
  findAllEnabled(): AlertRule[] {
    return db.alertRules.filter(r => r.enabled);
  },
  create(rule: Omit<AlertRule, 'id' | 'createdAt'>): AlertRule {
    const newRule: AlertRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    };
    db.alertRules.push(newRule);
    saveDb();
    return newRule;
  },
  update(id: string, userId: string, updates: Partial<Omit<AlertRule, 'id' | 'userId' | 'createdAt'>>): AlertRule | undefined {
    const rule = db.alertRules.find(r => r.id === id && r.userId === userId);
    if (!rule) return undefined;
    Object.assign(rule, updates);
    saveDb();
    return rule;
  },
  delete(id: string, userId: string): boolean {
    const idx = db.alertRules.findIndex(r => r.id === id && r.userId === userId);
    if (idx !== -1) {
      db.alertRules.splice(idx, 1);
      saveDb();
      return true;
    }
    return false;
  }
};

// Alert Events CRUD
export const dbAlertEvents = {
  findByUserId(userId: string): AlertEvent[] {
    return db.alertEvents
      .filter(e => e.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  create(event: Omit<AlertEvent, 'id' | 'createdAt' | 'isRead'>): AlertEvent {
    const newEvent: AlertEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    db.alertEvents.unshift(newEvent);
    if (db.alertEvents.length > 200) {
      db.alertEvents = db.alertEvents.slice(0, 200);
    }
    saveDb();
    return newEvent;
  },
  markAsRead(id: string, userId: string): boolean {
    const event = db.alertEvents.find(e => e.id === id && e.userId === userId);
    if (event) {
      event.isRead = true;
      saveDb();
      return true;
    }
    return false;
  },
  markAllAsRead(userId: string): number {
    let count = 0;
    for (const event of db.alertEvents) {
      if (event.userId === userId && !event.isRead) {
        event.isRead = true;
        count++;
      }
    }
    if (count > 0) saveDb();
    return count;
  }
};

// Citizen Reports CRUD
export const dbCitizenReports = {
  getAll(): CitizenReport[] {
    return [...db.citizenReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  findById(id: string): CitizenReport | undefined {
    return db.citizenReports.find(r => r.id === id);
  },
  create(report: Omit<CitizenReport, 'id' | 'createdAt' | 'upvotes' | 'status'>): CitizenReport {
    const newReport: CitizenReport = {
      ...report,
      id: `cit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      upvotes: 1,
      status: 'reported',
      createdAt: new Date().toISOString()
    };
    db.citizenReports.unshift(newReport);
    saveDb();
    return newReport;
  },
  upvote(id: string): CitizenReport | undefined {
    const rep = db.citizenReports.find(r => r.id === id);
    if (rep) {
      rep.upvotes += 1;
      saveDb();
      return rep;
    }
    return undefined;
  },
  updateStatus(id: string, status: CitizenReport['status'], assignedAuthority?: string): CitizenReport | undefined {
    const rep = db.citizenReports.find(r => r.id === id);
    if (rep) {
      rep.status = status;
      if (assignedAuthority) rep.assignedAuthority = assignedAuthority;
      saveDb();
      return rep;
    }
    return undefined;
  }
};

// Corridor Hotspots & BRICS Corridors CRUD
export const dbCorridors = {
  getAll(): BRICSCorridor[] {
    return db.bricsCorridors;
  },
  getById(id: string): BRICSCorridor | undefined {
    return db.bricsCorridors.find(c => c.id === id);
  },
  getHotspots(corridorId?: string): CorridorHotspot[] {
    if (corridorId) {
      return db.corridorHotspots.filter(h => h.corridorId === corridorId);
    }
    return db.corridorHotspots;
  },
  addHotspot(hotspot: Omit<CorridorHotspot, 'id' | 'detectedAt'>): CorridorHotspot {
    const newHotspot: CorridorHotspot = {
      ...hotspot,
      id: `hot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      detectedAt: new Date().toISOString()
    };
    db.corridorHotspots.unshift(newHotspot);
    saveDb();
    return newHotspot;
  }
};

// Federated Nodes CRUD
export const dbFederatedNodes = {
  getAll(): FederatedNode[] {
    return db.federatedNodes;
  },
  triggerSync(id: string): FederatedNode | undefined {
    const node = db.federatedNodes.find(n => n.id === id);
    if (node) {
      node.lastSync = new Date().toISOString();
      node.dataVectorsExchanged24h += Math.floor(Math.random() * 250 + 50);
      saveDb();
      return node;
    }
    return undefined;
  }
};
