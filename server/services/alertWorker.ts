import { dbAlertRules, dbAlertEvents, AlertRule } from '../db';
import { fetchAirQuality } from './airQuality';
import { fetchWeather } from './weather';
import { getEmergencyAlerts } from './disasterAlerts';

let workerInterval: NodeJS.Timeout | null = null;

export async function evaluateAllAlertRules(): Promise<{ evaluatedCount: number; newEventsCount: number }> {
  const enabledRules = dbAlertRules.findAllEnabled();
  let newEventsCount = 0;

  for (const rule of enabledRules) {
    try {
      const triggered = await evaluateSingleRule(rule);
      if (triggered) newEventsCount++;
      dbAlertRules.update(rule.id, rule.userId, { lastEvaluatedAt: new Date().toISOString() });
    } catch (err) {
      console.error(`Failed to evaluate alert rule ${rule.id}:`, err);
    }
  }

  return { evaluatedCount: enabledRules.length, newEventsCount };
}

export async function evaluateSingleRule(rule: AlertRule): Promise<boolean> {
  // Check if an event for this rule was created within the last 4 hours to prevent spam
  const existingEvents = dbAlertEvents.findByUserId(rule.userId);
  const recentDuplicate = existingEvents.find(
    e => e.alertRuleId === rule.id && Date.now() - new Date(e.createdAt).getTime() < 4 * 3600 * 1000
  );
  if (recentDuplicate) {
    return false;
  }

  let shouldTrigger = false;
  let eventType: any = 'aqi_exceeded';
  let severity: 'low' | 'moderate' | 'high' | 'severe' | 'emergency' = 'moderate';
  let title = '';
  let message = '';
  let source = 'AirAware Environmental Risk Engine';

  if (rule.alertType === 'aqi') {
    const air = await fetchAirQuality(rule.latitude, rule.longitude);
    const val = air.current.usAqi ?? (air.current.pm2_5 ? Math.round(air.current.pm2_5 * 2.2) : 50);
    if ((rule.comparison === 'above' && val >= rule.threshold) || (rule.comparison === 'below' && val <= rule.threshold)) {
      shouldTrigger = true;
      eventType = 'aqi_exceeded';
      severity = val > 200 ? 'severe' : val > 150 ? 'high' : 'moderate';
      title = `AQI Alert: ${val} in ${rule.locationName}`;
      message = `Air Quality Index in ${rule.locationName} reached ${val}, exceeding your threshold of ${rule.threshold}. Take appropriate precautions and wear an N95 mask outdoors.`;
      source = air.source;
    }
  } else if (rule.alertType === 'pm25') {
    const air = await fetchAirQuality(rule.latitude, rule.longitude);
    const val = air.current.pm2_5 ?? 0;
    if ((rule.comparison === 'above' && val >= rule.threshold) || (rule.comparison === 'below' && val <= rule.threshold)) {
      shouldTrigger = true;
      eventType = 'pm25_exceeded';
      severity = val > 100 ? 'severe' : val > 60 ? 'high' : 'moderate';
      title = `PM2.5 Alert: ${val} µg/m³ in ${rule.locationName}`;
      message = `PM2.5 fine particulate level in ${rule.locationName} is ${val} µg/m³ (Threshold: ${rule.threshold} µg/m³). WHO 24h limit is 15 µg/m³.`;
      source = air.source;
    }
  } else if (rule.alertType === 'temperature') {
    const weather = await fetchWeather(rule.latitude, rule.longitude);
    const val = weather.current.temperature;
    if ((rule.comparison === 'above' && val >= rule.threshold) || (rule.comparison === 'below' && val <= rule.threshold)) {
      shouldTrigger = true;
      eventType = 'heatwave_warning';
      severity = val >= 42 ? 'severe' : 'high';
      title = `Temperature Alert: ${val}°C in ${rule.locationName}`;
      message = `Ambient daytime temperature in ${rule.locationName} has reached ${val}°C (Threshold: ${rule.threshold}°C). Maintain hydration and stay in shade.`;
      source = weather.source;
    }
  } else if (rule.alertType === 'precipitation') {
    const weather = await fetchWeather(rule.latitude, rule.longitude);
    const val = weather.current.precipitation;
    if (val >= rule.threshold) {
      shouldTrigger = true;
      eventType = 'heavy_rain_warning';
      severity = val >= 25 ? 'severe' : 'moderate';
      title = `Heavy Precipitation Alert: ${val} mm in ${rule.locationName}`;
      message = `Current precipitation in ${rule.locationName} is ${val} mm (Threshold: ${rule.threshold} mm). Check for local drainage issues.`;
      source = weather.source;
    }
  } else if (rule.alertType === 'disaster') {
    const alerts = await getEmergencyAlerts(rule.latitude, rule.longitude, rule.locationName);
    if (alerts.length > 0) {
      const topAlert = alerts[0];
      shouldTrigger = true;
      eventType = 'official_bulletin';
      severity = topAlert.severity === 'extreme' ? 'emergency' : topAlert.severity === 'severe' ? 'severe' : 'high';
      title = topAlert.title;
      message = topAlert.headline;
      source = topAlert.source;
    }
  }

  if (shouldTrigger) {
    dbAlertEvents.create({
      userId: rule.userId,
      alertRuleId: rule.id,
      locationName: rule.locationName,
      eventType,
      severity,
      title,
      message,
      source
    });
    return true;
  }

  return false;
}

export function startAlertWorker() {
  if (workerInterval) return;
  // Run evaluation immediately after 15 seconds
  setTimeout(() => {
    evaluateAllAlertRules().catch(err => console.error('Alert worker initial run error:', err));
  }, 15000);

  // Then evaluate every 10 minutes
  workerInterval = setInterval(() => {
    evaluateAllAlertRules().catch(err => console.error('Alert worker periodic evaluation error:', err));
  }, 10 * 60 * 1000);
}

export function stopAlertWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
}
