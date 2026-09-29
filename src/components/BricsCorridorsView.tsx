import React, { useState, useEffect } from 'react';
import { 
  Globe2, 
  Flame, 
  Satellite, 
  Share2, 
  ShieldAlert, 
  Users, 
  UploadCloud, 
  Camera, 
  ArrowUpRight, 
  CheckCircle2, 
  RefreshCw, 
  Radio, 
  Wind, 
  Send, 
  AlertTriangle, 
  Building2, 
  Truck, 
  Sparkles,
  ThumbsUp,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { BRICSCorridor, CorridorHotspot, CitizenReport, FederatedNode } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface BricsCorridorsViewProps {
  onSelectCoordinates: (coords: { name: string; latitude: number; longitude: number; adminRegion?: string; country?: string }) => void;
  onNavigateToMap: () => void;
}

export const BricsCorridorsView: React.FC<BricsCorridorsViewProps> = ({
  onSelectCoordinates,
  onNavigateToMap
}) => {
  const { user } = useAuth();
  const [corridors, setCorridors] = useState<BRICSCorridor[]>([]);
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('corridor_indo_gangetic');
  const [hotspots, setHotspots] = useState<CorridorHotspot[]>([]);
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [nodes, setNodes] = useState<FederatedNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingNodeId, setSyncingNodeId] = useState<string | null>(null);

  // New Citizen Incident Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLocation, setReportLocation] = useState('Gurugram Sector-62 Industrial Belt');
  const [reportLat, setReportLat] = useState(28.415);
  const [reportLon, setReportLon] = useState(77.085);
  const [emissionType, setEmissionType] = useState<'agricultural_burning' | 'industrial_plume' | 'waste_incineration' | 'transboundary_smog' | 'traffic_corridor'>('agricultural_burning');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recentAiAnalysis, setRecentAiAnalysis] = useState<any | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [corrRes, hotRes, repRes, nodeRes] = await Promise.all([
        api.getBricsCorridors(),
        api.getCorridorHotspots(),
        api.getCitizenReports(),
        api.getFederatedNodes()
      ]);
      setCorridors(corrRes.corridors || []);
      setHotspots(hotRes.hotspots || []);
      setReports(repRes.reports || []);
      setNodes(nodeRes.nodes || []);
    } catch (err) {
      console.error('Failed to load BRICS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedCorridor = corridors.find(c => c.id === selectedCorridorId) || corridors[0];
  const activeHotspots = hotspots.filter(h => !selectedCorridorId || h.corridorId === selectedCorridorId);

  const handleSyncNode = async (nodeId: string) => {
    setSyncingNodeId(nodeId);
    try {
      const res = await api.syncFederatedNode(nodeId);
      setNodes(prev => prev.map(n => n.id === nodeId ? res.node : n));
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setTimeout(() => setSyncingNodeId(null), 800);
    }
  };

  const handleUpvote = async (id: string) => {
    try {
      const res = await api.upvoteCitizenReport(id);
      setReports(prev => prev.map(r => r.id === id ? res.report : r));
    } catch (err) {
      console.error('Upvote failed:', err);
    }
  };

  const handleDispatchTicket = async (id: string, authorityName?: string) => {
    try {
      const res = await api.dispatchAuthorityTicket(id, authorityName);
      setReports(prev => prev.map(r => r.id === id ? res.report : r));
    } catch (err) {
      console.error('Dispatch failed:', err);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    setRecentAiAnalysis(null);

    try {
      const res = await api.submitCitizenReport({
        locationName: reportLocation,
        latitude: reportLat,
        longitude: reportLon,
        emissionType,
        description,
        corridorId: selectedCorridorId
      });
      setReports(prev => [res.report, ...prev]);
      setRecentAiAnalysis(res.aiAnalysis);
      setDescription('');
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && corridors.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Synchronizing BRICS federated nodes and satellite thermal clusters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-cyan-500/30 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wider">
              <Globe2 className="w-4 h-4" />
              <span>BRICS Federated Climate Action Platform</span>
              <span className="text-slate-600">•</span>
              <span className="text-teal-400 font-mono">Cross-Border Air Corridor Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Hyper-Local & Trans-Boundary Pollution Detection
            </h1>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Major cities monitor macro indicators but miss rapid ground fires, clandestine industrial stacks, and trans-boundary aerosol plumes. AirAware unites <strong>citizen-sourced photo reports</strong> with <strong>VIIRS/Sentinel-5P satellite thermal anomalies</strong> and <strong>federated model sharing</strong> across BRICS economic corridors.
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => setShowReportModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Report Local Pollution Incident</span>
            </button>
            <button
              onClick={onNavigateToMap}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <Satellite className="w-4 h-4 text-cyan-400" />
              <span>Inspect Satellite Hotspots Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. Federated Node Interoperability Registry */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Share2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              BRICS Federated Model Interoperability Nodes
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Decentralized weights sync • Zero private data transfer
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {nodes.map(node => (
            <div key={node.id} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {node.country}
                  </span>
                  <span className="text-[9px] font-mono text-cyan-300 uppercase px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                    {node.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium truncate" title={node.agency}>
                  {node.agency}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">
                  Model: {node.sharedModel}
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">{node.dataVectorsExchanged24h.toLocaleString()} vectors/day</span>
                <button
                  onClick={() => handleSyncNode(node.id)}
                  disabled={syncingNodeId === node.id}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${syncingNodeId === node.id ? 'animate-spin' : ''}`} />
                  <span>Sync</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Major Economic Corridors Selector & Downstream Trans-boundary Vectors */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Radio className="w-4 h-4 text-teal-400" />
            <h3 className="text-base font-bold">
              Monitored BRICS Economic Corridors & Stubble Smog Belts
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Select a corridor to analyze trans-boundary trajectories
          </span>
        </div>

        {/* Corridor Pill Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {corridors.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCorridorId(c.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                selectedCorridorId === c.id
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-md shadow-teal-500/10'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <span>{c.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase ${
                c.transboundaryRiskLevel === 'critical' ? 'bg-red-500/20 text-red-300' :
                c.transboundaryRiskLevel === 'severe' ? 'bg-amber-500/20 text-amber-300' :
                'bg-slate-800 text-slate-400'
              }`}>
                {c.transboundaryRiskLevel}
              </span>
            </button>
          ))}
        </div>

        {/* Active Corridor Detailed Dashboard */}
        {selectedCorridor && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-teal-400 font-semibold uppercase mb-1">
                  <span>Corridor Overview</span>
                  <span>•</span>
                  <span>Lead Agency: {selectedCorridor.leadAgency}</span>
                </div>
                <h4 className="text-xl font-bold text-white tracking-tight">{selectedCorridor.name}</h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {selectedCorridor.description}
                </p>
              </div>

              {/* Economic Hubs & Drivers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Major Economic Hubs Impacted
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {selectedCorridor.economicHubs.map((hub, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-slate-900 text-slate-200 border border-slate-800">
                        {hub}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Primary Pollution Drivers
                  </div>
                  <div className="space-y-1 text-xs text-slate-300 mt-1.5">
                    {selectedCorridor.primaryPollutionDrivers.map((driver, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>{driver}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase">
                  Corridor Regional Average AQI
                </div>
                <div className="text-4xl font-black font-mono text-white mt-1">
                  {selectedCorridor.currentAvgAqi}
                </div>
                <div className="text-xs text-amber-400 mt-1 font-medium">
                  {selectedCorridor.currentAvgAqi > 200 ? 'Severe Cross-Border Smog' : 'Elevated Corridor Exposure'}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase">
                  Active Satellite Thermal Anomalies
                </div>
                <div className="text-2xl font-black font-mono text-teal-400 mt-0.5">
                  {activeHotspots.length} Clusters Detected
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  via VIIRS 375m & Sentinel-5P TROPOMI
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectCoordinates({
                    name: selectedCorridor.name.split('&')[0].trim(),
                    latitude: selectedCorridor.centerCoordinates.lat,
                    longitude: selectedCorridor.centerCoordinates.lon,
                    country: selectedCorridor.memberStates[0]
                  });
                }}
                className="w-full py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold transition-colors cursor-pointer"
              >
                Inspect Coordinates on Global Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Satellite Remote Sensing & Thermal Plumes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Flame className="w-4 h-4 text-orange-400" />
            <h3 className="text-base font-bold">
              Detected Thermal Anomalies & Downstream Dispersion Plumes ({activeHotspots.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Real-time optical depth & agricultural fire tracking
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeHotspots.map(hot => (
            <div key={hot.id} className="p-5 rounded-3xl bg-slate-900 border border-orange-500/30 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  {hot.region} ({hot.country})
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800">
                  {hot.satelliteSource}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Thermal Radiative Power</div>
                  <div className="text-sm font-bold font-mono text-white mt-0.5">
                    {hot.thermalRadiativePowerMW} MW
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Est. PM2.5 Hourly Flux</div>
                  <div className="text-sm font-bold font-mono text-white mt-0.5">
                    {hot.estimatedPm25FluxKgPerHour} kg/hr
                  </div>
                </div>
              </div>

              {/* Wind Trajectory & Downstream Impact */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1 mb-1">
                  <Wind className="w-3.5 h-3.5" />
                  Wind Dispersion Trajectory ({hot.windTrajectoryVector.speedKmh} km/h @ {hot.windTrajectoryVector.bearingDeg}°)
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {hot.windTrajectoryVector.downstreamImpact}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Coordinates: {hot.latitude.toFixed(3)}°N, {hot.longitude.toFixed(3)}°E</span>
                <span className="font-mono">{new Date(hot.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Citizen-Sourced Incident Reports & AI Plume Verification */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-400" />
              Citizen Ground Truth & AI Plume Verification
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Crowdsourced micro-observations classified by Gemini vision AI to reveal hidden emissions missed by macro monitoring
            </p>
          </div>
          <button
            onClick={() => setShowReportModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Submit Observation</span>
          </button>
        </div>

        {/* Reports Feed */}
        <div className="space-y-3">
          {reports.map(rep => (
            <div key={rep.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white">{rep.locationName}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-800 text-teal-300 border border-slate-700">
                      {rep.emissionType.replace('_', ' ')}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      rep.status === 'authority_dispatched' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                      rep.status === 'satellite_verified' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {rep.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Reported by {rep.reporterName} • {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpvote(rep.id)}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-teal-400" />
                    <span>{rep.upvotes}</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                "{rep.description}"
              </p>

              {/* Gemini AI Verification Card */}
              {rep.aiAnalysis && (
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px] uppercase">
                      <Sparkles className="w-3.5 h-3.5" />
                      Gemini Visual & Plume Analysis
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Confidence: {Math.round(rep.aiAnalysis.confidence * 100)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Classification:</span>
                      <strong className="text-white">{rep.aiAnalysis.plumeClassification}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Smoke Opacity:</span>
                      <strong className="text-amber-400 font-mono">{rep.aiAnalysis.opticalOpacityPercent}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Local PM2.5 Impact:</span>
                      <strong className="text-red-400 font-mono">+{rep.aiAnalysis.estimatedPm25Contribution} µg/m³</strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    Health Note: {rep.aiAnalysis.healthAdvisory}
                  </p>
                </div>
              )}

              {/* Assigned Authority Dispatch Action */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-400 truncate max-w-[280px]">
                  Assigned Authority: <strong className="text-slate-200">{rep.assignedAuthority || 'Evaluating Routing...'}</strong>
                </span>

                {rep.status !== 'authority_dispatched' && rep.status !== 'contained' ? (
                  <button
                    onClick={() => handleDispatchTicket(rep.id, rep.assignedAuthority)}
                    className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Dispatch Rapid Squad</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Enforcement Action Dispatched
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submission Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-teal-400" />
                Submit Citizen Pollution Observation
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Every citizen photo and ground report is immediately passed to <strong>Google Gemini AI</strong> for plume classification, opacity calculation, and rapid routing to regional pollution control boards.
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Location / Micro-Area
                </label>
                <input
                  type="text"
                  required
                  value={reportLocation}
                  onChange={e => setReportLocation(e.target.value)}
                  placeholder="e.g. Sohna Road, Gurugram or Ludhiana Farmlands"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={reportLat}
                    onChange={e => setReportLat(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={reportLon}
                    onChange={e => setReportLon(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Emission Category
                </label>
                <select
                  value={emissionType}
                  onChange={e => setEmissionType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="agricultural_burning">Agricultural Stubble / Paddy Straw Burning</option>
                  <option value="industrial_plume">Industrial Chimney / Smelter Stack Smoke</option>
                  <option value="waste_incineration">Open Plastic & Municipal Solid Waste Burning</option>
                  <option value="transboundary_smog">Trans-Boundary Smog Plume Inversion</option>
                  <option value="traffic_corridor">Heavy Diesel Freight Corridor Smog</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Visual Description (Color, Smell, Direction of Smoke)
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Dense black plumes rising from factory chimney with strong sulfur odor, drifting south towards residential housing..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {recentAiAnalysis && (
                <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    AI Incident Classified Successfully:
                  </div>
                  <div>Class: <strong>{recentAiAnalysis.plumeClassification}</strong></div>
                  <div>Estimated PM2.5 Delta: <strong>+{recentAiAnalysis.estimatedPm25Contribution} µg/m³</strong></div>
                  <div>Routed to: <strong>{recentAiAnalysis.targetAuthority}</strong></div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{submitting ? 'Analyzing with AI...' : 'Submit & Analyze'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
