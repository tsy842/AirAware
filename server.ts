import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { 
  initDb, 
  dbUsers, 
  dbSavedLocations, 
  dbAlertRules, 
  dbAlertEvents, 
  dbCitizenReports,
  dbCorridors,
  dbFederatedNodes,
  User 
} from './server/db';
import { fetchAirQuality } from './server/services/airQuality';
import { fetchWeather } from './server/services/weather';
import { searchLocations, reverseGeocode } from './server/services/geocoding';
import { evaluateRiskIntelligence } from './server/services/riskEngine';
import { getEmergencyAlerts, getDemoEmergencyScenarios } from './server/services/disasterAlerts';
import { askEnvironmentalAssistant } from './server/services/gemini';
import { analyzeCitizenIncident } from './server/services/citizenAi';
import { startAlertWorker, evaluateAllAlertRules } from './server/services/alertWorker';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'airaware_hackathon_super_secret_jwt_key_2026';

app.use(express.json());

// Initialize database & background alert worker
initDb();
startAlertWorker();

// JWT Authentication Middleware
export interface AuthenticatedRequest extends Request {
  user?: User;
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    const user = dbUsers.findById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User associated with token no longer exists.' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }
}

// Optional Auth (attaches user if token present)
function optionalAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      const user = dbUsers.findById(payload.userId);
      if (user) req.user = user;
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// System Health
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    product: 'AirAware Environmental Intelligence Platform',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    geminiConfigured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  });
});

// Sources & Transparency
app.get('/api/sources', (req: Request, res: Response) => {
  res.json({
    sources: [
      {
        name: 'Open-Meteo Air Quality API',
        url: 'https://air-quality-api.open-meteo.com',
        type: 'Atmospheric Chemistry Forecast & Chemical Transport Model',
        models: 'Copernicus Atmosphere Monitoring Service (CAMS) & SILAM',
        variables: ['PM2.5', 'PM10', 'US AQI', 'European AQI', 'NO2', 'Ozone', 'CO', 'SO2'],
        limitations: 'Model-based forecast estimate, not a ground-based statutory monitoring station.'
      },
      {
        name: 'Open-Meteo Weather API',
        url: 'https://open-meteo.com',
        type: 'Global Numerical Weather Prediction',
        models: 'ECMWF IFS, GFS, ICON',
        variables: ['Temperature', 'Humidity', 'Wind Speed/Direction', 'Precipitation', 'Weather Code', 'Pressure'],
        limitations: 'Grid-scale interpolated meteorological forecasts.'
      },
      {
        name: 'Open-Meteo Geocoding API',
        url: 'https://geocoding-api.open-meteo.com',
        type: 'Global Gazeteer & Place Names',
        database: 'OpenStreetMap GeoNames Database',
        limitations: 'Accuracy subject to OpenStreetMap gazetteer coverage.'
      },
      {
        name: 'Official Disaster & Meteorology Bulletins',
        url: 'https://mausam.imd.gov.in',
        type: 'India Meteorological Department (IMD) / NDMA Official Bulletins',
        classification: 'Official Government Warnings & CAP Alerts'
      },
      {
        name: 'Google Gemini AI',
        url: 'https://ai.google.dev',
        type: 'Large Language Model (gemini-3.8-flash)',
        role: 'Environmental Health & Preparedness Advisory Assistant',
        disclaimer: 'AI-generated summaries do not constitute personalized medical diagnosis or official municipal decrees.'
      }
    ]
  });
});

// 1. AUTHENTICATION
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ error: 'Valid name is required (at least 2 characters).' });
    return;
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email address is required.' });
    return;
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }

  const existing = dbUsers.findByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newUser = dbUsers.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    preferredCity: 'Gurugram',
    preferredLat: 28.4595,
    preferredLon: 77.0266,
    units: 'metric'
  });

  const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      preferredCity: newUser.preferredCity,
      preferredLat: newUser.preferredLat,
      preferredLon: newUser.preferredLon,
      units: newUser.units,
      createdAt: newUser.createdAt
    }
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = dbUsers.findByEmail(email);
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const match = bcrypt.compareSync(password, user.passwordHash);
  if (!match) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      preferredCity: user.preferredCity,
      preferredLat: user.preferredLat,
      preferredLon: user.preferredLon,
      units: user.units,
      createdAt: user.createdAt
    }
  });
});

app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      preferredCity: user.preferredCity,
      preferredLat: user.preferredLat,
      preferredLon: user.preferredLon,
      units: user.units,
      createdAt: user.createdAt
    }
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully.' });
});

// 2. USER PROFILE & PREFERENCES
app.get('/api/users/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    preferredCity: user.preferredCity,
    preferredLat: user.preferredLat,
    preferredLon: user.preferredLon,
    units: user.units,
    createdAt: user.createdAt
  });
});

app.patch('/api/users/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { name, preferredCity, preferredLat, preferredLon, units } = req.body;

  const updates: any = {};
  if (name && typeof name === 'string') updates.name = name.trim();
  if (preferredCity && typeof preferredCity === 'string') updates.preferredCity = preferredCity.trim();
  if (typeof preferredLat === 'number') updates.preferredLat = preferredLat;
  if (typeof preferredLon === 'number') updates.preferredLon = preferredLon;
  if (units === 'metric' || units === 'imperial') updates.units = units;

  const updated = dbUsers.update(user.id, updates);
  res.json({
    user: {
      id: updated!.id,
      name: updated!.name,
      email: updated!.email,
      preferredCity: updated!.preferredCity,
      preferredLat: updated!.preferredLat,
      preferredLon: updated!.preferredLon,
      units: updated!.units
    }
  });
});

// Saved Locations
app.get('/api/users/locations', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const locations = dbSavedLocations.findByUserId(user.id);
  res.json({ locations });
});

app.post('/api/users/locations', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { name, latitude, longitude, adminRegion, country } = req.body;

  if (!name || typeof latitude !== 'number' || typeof longitude !== 'number') {
    res.status(400).json({ error: 'Name, latitude, and longitude are required.' });
    return;
  }

  const saved = dbSavedLocations.create({
    userId: user.id,
    name: name.trim(),
    latitude,
    longitude,
    adminRegion,
    country
  });

  res.status(201).json({ location: saved });
});

app.delete('/api/users/locations/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const success = dbSavedLocations.delete(req.params.id, user.id);
  if (!success) {
    res.status(404).json({ error: 'Saved location not found or not owned by you.' });
    return;
  }
  res.json({ success: true, message: 'Location removed from favorites.' });
});

// 3. GEOCODING
app.get('/api/geocoding/search', async (req: Request, res: Response) => {
  const q = req.query.q as string;
  if (!q) {
    res.json({ results: [] });
    return;
  }
  try {
    const results = await searchLocations(q);
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: 'Geocoding search failed', details: err.message });
  }
});

app.get('/api/geocoding/reverse', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.latitude as string);
  const lon = parseFloat(req.query.longitude as string);
  if (isNaN(lat) || isNaN(lon)) {
    res.status(400).json({ error: 'Valid latitude and longitude query parameters required.' });
    return;
  }
  try {
    const info = await reverseGeocode(lat, lon);
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: 'Reverse geocode failed', details: err.message });
  }
});

// 4. ENVIRONMENTAL & WEATHER
app.get('/api/environmental/current', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.latitude as string || '28.4595');
  const lon = parseFloat(req.query.longitude as string || '77.0266');
  if (isNaN(lat) || isNaN(lon)) {
    res.status(400).json({ error: 'Valid latitude and longitude required.' });
    return;
  }

  try {
    const airQuality = await fetchAirQuality(lat, lon);
    res.json(airQuality);
  } catch (err: any) {
    res.status(502).json({ error: 'Failed to fetch air quality data from Open-Meteo', details: err.message });
  }
});

app.get('/api/weather/current', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.latitude as string || '28.4595');
  const lon = parseFloat(req.query.longitude as string || '77.0266');
  if (isNaN(lat) || isNaN(lon)) {
    res.status(400).json({ error: 'Valid latitude and longitude required.' });
    return;
  }

  try {
    const weather = await fetchWeather(lat, lon);
    res.json(weather);
  } catch (err: any) {
    res.status(502).json({ error: 'Failed to fetch weather data from Open-Meteo', details: err.message });
  }
});

// Risk Intelligence Module (The USP feature)
app.get('/api/environmental/risk', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.latitude as string || '28.4595');
  const lon = parseFloat(req.query.longitude as string || '77.0266');
  if (isNaN(lat) || isNaN(lon)) {
    res.status(400).json({ error: 'Valid latitude and longitude required.' });
    return;
  }

  try {
    const [airQuality, weather] = await Promise.all([
      fetchAirQuality(lat, lon),
      fetchWeather(lat, lon)
    ]);

    const report = evaluateRiskIntelligence(airQuality, weather);
    res.json(report);
  } catch (err: any) {
    res.status(502).json({ error: 'Failed to compute environmental risk intelligence', details: err.message });
  }
});

// 5. OFFICIAL DISASTER & EMERGENCY BULLETINS
app.get('/api/emergency/alerts', async (req: Request, res: Response) => {
  const lat = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
  const lon = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;
  const locationName = req.query.locationName as string | undefined;

  try {
    const alerts = await getEmergencyAlerts(lat, lon, locationName);
    res.json({ alerts });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve disaster alerts', details: err.message });
  }
});

app.get('/api/emergency/scenarios', (req: Request, res: Response) => {
  const scenarios = getDemoEmergencyScenarios();
  res.json({ scenarios });
});

// 6. ALERT RULES & NOTIFICATIONS
app.get('/api/alerts', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const rules = dbAlertRules.findByUserId(user.id);
  res.json({ rules });
});

app.post('/api/alerts', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { locationName, latitude, longitude, alertType, threshold, comparison } = req.body;

  if (!locationName || typeof latitude !== 'number' || typeof longitude !== 'number' || !alertType || typeof threshold !== 'number') {
    res.status(400).json({ error: 'Location details, alertType, and numeric threshold are required.' });
    return;
  }

  const newRule = dbAlertRules.create({
    userId: user.id,
    locationName: locationName.trim(),
    latitude,
    longitude,
    alertType,
    threshold,
    comparison: comparison === 'below' ? 'below' : 'above',
    enabled: true
  });

  res.status(201).json({ rule: newRule });
});

app.patch('/api/alerts/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const updates = req.body;

  const updated = dbAlertRules.update(req.params.id, user.id, updates);
  if (!updated) {
    res.status(404).json({ error: 'Alert rule not found.' });
    return;
  }
  res.json({ rule: updated });
});

app.delete('/api/alerts/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const success = dbAlertRules.delete(req.params.id, user.id);
  if (!success) {
    res.status(404).json({ error: 'Alert rule not found.' });
    return;
  }
  res.json({ success: true, message: 'Alert rule deleted.' });
});

app.get('/api/alerts/events', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const events = dbAlertEvents.findByUserId(user.id);
  res.json({ events });
});

app.patch('/api/alerts/events/:id/read', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const success = dbAlertEvents.markAsRead(req.params.id, user.id);
  res.json({ success });
});

app.post('/api/alerts/events/read-all', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const count = dbAlertEvents.markAllAsRead(user.id);
  res.json({ success: true, markedCount: count });
});

app.post('/api/alerts/evaluate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await evaluateAllAlertRules();
    res.json({ message: 'Alert evaluation completed', ...result });
  } catch (err: any) {
    res.status(500).json({ error: 'Evaluation failed', details: err.message });
  }
});

// 7. BRICS FEDERATED CORRIDORS & SATELLITE HOTSPOTS
app.get('/api/brics/corridors', (req: Request, res: Response) => {
  res.json({ corridors: dbCorridors.getAll() });
});

app.get('/api/brics/hotspots', (req: Request, res: Response) => {
  const corridorId = req.query.corridorId as string | undefined;
  res.json({ hotspots: dbCorridors.getHotspots(corridorId) });
});

app.get('/api/brics/nodes', (req: Request, res: Response) => {
  res.json({ nodes: dbFederatedNodes.getAll() });
});

app.post('/api/brics/nodes/:id/sync', (req: Request, res: Response) => {
  const node = dbFederatedNodes.triggerSync(req.params.id);
  if (!node) {
    res.status(404).json({ error: 'Federated node not found' });
    return;
  }
  res.json({ success: true, node });
});

// 8. CITIZEN-SOURCED GRANULAR INCIDENTS & AI VERIFICATION
app.get('/api/citizen/reports', (req: Request, res: Response) => {
  res.json({ reports: dbCitizenReports.getAll() });
});

app.post('/api/citizen/reports', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { 
    locationName, 
    latitude, 
    longitude, 
    emissionType, 
    description, 
    photoUrl, 
    imageBase64,
    estimatedSeverity,
    corridorId 
  } = req.body;

  if (!locationName || typeof latitude !== 'number' || typeof longitude !== 'number' || !emissionType || !description) {
    res.status(400).json({ error: 'Location, coordinates, emissionType, and description are required.' });
    return;
  }

  // Perform AI Visual & Plume Analysis
  const aiAnalysis = await analyzeCitizenIncident(description, emissionType, locationName, imageBase64);

  const newReport = dbCitizenReports.create({
    userId: req.user?.id || 'usr_anonymous_citizen',
    reporterName: req.user?.name || 'Concerned Local Resident',
    locationName: locationName.trim(),
    latitude,
    longitude,
    emissionType,
    description: description.trim(),
    photoUrl: photoUrl || (imageBase64 ? 'data:image/jpeg;base64,...' : undefined),
    estimatedSeverity: estimatedSeverity || (aiAnalysis.estimatedPm25Contribution > 140 ? 'severe' : 'high'),
    aiAnalysis: {
      plumeClassification: aiAnalysis.plumeClassification,
      opticalOpacityPercent: aiAnalysis.opticalOpacityPercent,
      estimatedPm25Contribution: aiAnalysis.estimatedPm25Contribution,
      healthAdvisory: aiAnalysis.healthAdvisory,
      confidence: aiAnalysis.confidence
    },
    assignedAuthority: aiAnalysis.targetAuthority,
    corridorId: corridorId || 'corridor_indo_gangetic'
  });

  res.status(201).json({ report: newReport, aiAnalysis });
});

app.post('/api/citizen/reports/:id/vote', (req: Request, res: Response) => {
  const updated = dbCitizenReports.upvote(req.params.id);
  if (!updated) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }
  res.json({ success: true, upvotes: updated.upvotes, report: updated });
});

app.post('/api/citizen/reports/:id/dispatch', optionalAuthMiddleware, (req: Request, res: Response) => {
  const { authorityName } = req.body;
  const updated = dbCitizenReports.updateStatus(
    req.params.id, 
    'authority_dispatched', 
    authorityName || 'State Pollution Control Board Fast-Action Cell'
  );
  if (!updated) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }
  res.json({ 
    success: true, 
    message: 'Rapid intervention dispatch ticket created and routed to regional authority.',
    report: updated 
  });
});

// 9. AI ENVIRONMENTAL ASSISTANT (Gemini)
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { question, context, history } = req.body;

  if (!question || typeof question !== 'string') {
    res.status(400).json({ error: 'Question string is required.' });
    return;
  }

  try {
    const result = await askEnvironmentalAssistant(question, context || {
      locationName: 'Current Location',
      latitude: 28.4595,
      longitude: 77.0266
    }, history || []);

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'AI Assistant failed', details: err.message });
  }
});

// -------------------------------------------------------------
// VITE DEV SERVER OR STATIC PRODUCTION SERVE
// -------------------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AirAware Platform server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting AirAware server:', err);
  process.exit(1);
});
