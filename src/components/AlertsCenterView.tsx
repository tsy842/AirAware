import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ExternalLink, 
  Play, 
  Bell, 
  CheckCheck, 
  AlertTriangle, 
  LifeBuoy, 
  Flame, 
  Waves, 
  Wind,
  Info
} from 'lucide-react';
import { AlertRule, AlertEvent, EmergencyAlert } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

interface AlertsCenterViewProps {
  currentLocation: {
    name: string;
    latitude: number;
    longitude: number;
  };
  alerts: EmergencyAlert[];
}

export const AlertsCenterView: React.FC<AlertsCenterViewProps> = ({
  currentLocation,
  alerts
}) => {
  const { user, token } = useAuth();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [evalMessage, setEvalMessage] = useState<string | null>(null);

  // New Rule Form State
  const [showAddRule, setShowAddRule] = useState(false);
  const [newAlertType, setNewAlertType] = useState<'aqi' | 'pm25' | 'temperature' | 'precipitation' | 'disaster'>('aqi');
  const [newThreshold, setNewThreshold] = useState<number>(150);
  const [newComparison, setNewComparison] = useState<'above' | 'below'>('above');
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [rulesRes, eventsRes] = await Promise.all([
        api.getAlertRules(),
        api.getAlertEvents()
      ]);
      setRules(rulesRes.rules || []);
      setEvents(eventsRes.events || []);
    } catch (err) {
      console.error('Failed to load alert rules or events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.createAlertRule({
        locationName: currentLocation.name,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        alertType: newAlertType,
        threshold: Number(newThreshold),
        comparison: newComparison
      });
      setRules(prev => [...prev, res.rule]);
      setShowAddRule(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create alert rule');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await api.deleteAlertRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Delete rule failed:', err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markEventRead(id);
      setEvents(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e));
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllEventsRead();
      setEvents(prev => prev.map(e => ({ ...e, isRead: true })));
    } catch (err) {
      console.error('Mark all read failed:', err);
    }
  };

  const handleEvaluateNow = async () => {
    setEvaluating(true);
    setEvalMessage(null);
    try {
      const res = await api.evaluateAlertsNow();
      setEvalMessage(`Evaluated ${res.evaluatedCount} rules. ${res.newEventsCount} new alerts triggered!`);
      const eventsRes = await api.getAlertEvents();
      setEvents(eventsRes.events || []);
    } catch (err: any) {
      setEvalMessage(err.message || 'Evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-teal-400" />
            Climate Resilience & Emergency Alert Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time disaster bulletins, IMD official advisories, user-configured exposure thresholds, and survival checklists.
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleEvaluateNow}
              disabled={evaluating}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 text-teal-400" />
              <span>{evaluating ? 'Evaluating...' : 'Evaluate Rules Now'}</span>
            </button>
            <button
              onClick={() => setShowAddRule(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-teal-500/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Alert Rule</span>
            </button>
          </div>
        )}
      </div>

      {evalMessage && (
        <div className="p-3.5 rounded-2xl bg-teal-500/15 border border-teal-500/40 text-teal-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400" />
          <span>{evalMessage}</span>
        </div>
      )}

      {/* Section 1: Active Official Bulletins & Preparedness Checklists */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Official Disaster Warnings & Meteorological Bulletins
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map(alert => (
            <div 
              key={alert.id}
              className={`p-5 rounded-3xl border transition-all ${
                alert.severity === 'extreme'
                  ? 'bg-red-950/40 border-red-500/50'
                  : alert.severity === 'severe'
                    ? 'bg-amber-950/40 border-amber-500/50'
                    : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                  alert.classification === 'OFFICIAL_GOVERNMENT_WARNING'
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {alert.classification === 'OFFICIAL_GOVERNMENT_WARNING' ? 'Official Government Warning' : 'Forecast Estimate'}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {new Date(alert.issuedAt).toLocaleDateString()}
                </span>
              </div>

              <h4 className="text-sm font-bold text-white mb-1.5">{alert.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">{alert.description}</p>

              {/* Action items */}
              <div className="mb-3 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Recommended Immediate Precautions
                </div>
                {alert.actions.map((act, i) => (
                  <div key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                    <span className="text-teal-400">•</span>
                    <span>{act}</span>
                  </div>
                ))}
              </div>

              {/* Emergency Checklist */}
              {alert.emergencyChecklist && (
                <div className="mt-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                  <div className="text-[11px] font-bold text-teal-300 flex items-center gap-1.5 mb-1.5">
                    <LifeBuoy className="w-3.5 h-3.5" />
                    <span>{alert.emergencyChecklist.title}</span>
                  </div>
                  <div className="space-y-1">
                    {alert.emergencyChecklist.items.map((item, i) => (
                      <div key={i} className="text-[11px] text-slate-400 flex items-center gap-2">
                        <input type="checkbox" className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="truncate max-w-[220px]">Source: {alert.source}</span>
                <a
                  href={alert.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-400 hover:text-teal-300 flex items-center gap-1 shrink-0 font-medium"
                >
                  Official Feed <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: User Alert Rules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-400" />
              Custom Environmental Trigger Rules
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              The AirAware backend periodically checks environmental models against your custom thresholds
            </p>
          </div>
        </div>

        {/* Create Rule Modal Form */}
        {showAddRule && (
          <form onSubmit={handleCreateRule} className="p-5 rounded-3xl bg-slate-900 border border-teal-500/40 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Create New Alert Rule for {currentLocation.name}</h4>
              <button
                type="button"
                onClick={() => setShowAddRule(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Trigger Condition</label>
                <select
                  value={newAlertType}
                  onChange={e => setNewAlertType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="aqi">Air Quality Index (AQI)</option>
                  <option value="pm25">PM2.5 Concentration (µg/m³)</option>
                  <option value="temperature">Daytime Temperature (°C)</option>
                  <option value="precipitation">Heavy Precipitation (mm)</option>
                  <option value="disaster">Official Disaster Bulletin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Comparison</label>
                <select
                  value={newComparison}
                  onChange={e => setNewComparison(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="above">Rises Above (&gt;=)</option>
                  <option value="below">Drops Below (&lt;=)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Threshold Value</label>
                <input
                  type="number"
                  required
                  value={newThreshold}
                  onChange={e => setNewThreshold(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddRule(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
              >
                {creating ? 'Saving...' : 'Activate Rule'}
              </button>
            </div>
          </form>
        )}

        {rules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rules.map(rule => (
              <div key={rule.id} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">{rule.locationName}</div>
                  <div className="text-xs text-teal-400 font-mono mt-0.5 uppercase">
                    {rule.alertType} {rule.comparison} {rule.threshold}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Last evaluated: {rule.lastEvaluatedAt ? new Date(rule.lastEvaluatedAt).toLocaleTimeString() : 'Pending'}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-center">
            <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No Custom Alert Rules Configured</p>
            <p className="text-xs text-slate-500 mt-1">
              Create an alert rule to monitor AQI spikes, heatwaves, or rainfall events for your favorite locations.
            </p>
          </div>
        )}
      </div>

      {/* Section 3: Notification Events History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-teal-400" />
            Notification Events & Alert History
          </h3>
          {events.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-teal-400 hover:text-teal-300 font-medium"
            >
              Mark All as Read
            </button>
          )}
        </div>

        {events.length > 0 ? (
          <div className="space-y-2">
            {events.map(event => (
              <div
                key={event.id}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  !event.isRead
                    ? 'bg-slate-900 border-teal-500/40'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    {!event.isRead && (
                      <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                    )}
                    <span className="font-bold text-xs text-white">{event.title}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      event.severity === 'severe' || event.severity === 'emergency' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {event.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{event.message}</p>
                  <div className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-2">
                    <span>{event.locationName}</span>
                    <span>•</span>
                    <span>{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>•</span>
                    <span>Source: {event.source}</span>
                  </div>
                </div>

                {!event.isRead && (
                  <button
                    onClick={() => handleMarkRead(event.id)}
                    className="text-[11px] font-medium text-slate-400 hover:text-white shrink-0 px-2 py-1 rounded bg-slate-800"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
            No notification events logged yet. Trigger an evaluation above to test your rules!
          </div>
        )}
      </div>
    </div>
  );
};
