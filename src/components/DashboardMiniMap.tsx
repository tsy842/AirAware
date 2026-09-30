import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { 
  Layers, 
  Maximize2, 
  Navigation, 
  Mountain, 
  Satellite, 
  Map as MapIcon, 
  Plus, 
  Minus,
  Compass,
  ExternalLink
} from 'lucide-react';
import { getIndiaCpcbCategory, INDIA_MAJOR_STATIONS } from './MapView';

interface DashboardMiniMapProps {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    adminRegion?: string;
    country?: string;
  };
  aqi?: number | null;
  onOpenFullMap: () => void;
}

type MiniMapLayer = 'terrain' | 'satellite' | 'streets';

export const DashboardMiniMap: React.FC<DashboardMiniMapProps> = ({
  location,
  aqi,
  onOpenFullMap
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeLayer, setActiveLayer] = useState<MiniMapLayer>('terrain');
  const [currentZoom, setCurrentZoom] = useState<number>(10);

  // Helper to apply tile layers safely
  const setTileLayer = useCallback((map: L.Map, layer: MiniMapLayer) => {
    if (currentTileLayerRef.current) {
      try {
        map.removeLayer(currentTileLayerRef.current);
      } catch {
        // Safe removal
      }
      currentTileLayerRef.current = null;
    }

    let url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
    let attribution = '&copy; Esri World Topo Map';
    let maxZoom = 18;

    if (layer === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri World Imagery';
      maxZoom = 18;
    } else if (layer === 'streets') {
      url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; OpenStreetMap';
      maxZoom = 19;
    }

    const tileLayer = L.tileLayer(url, {
      attribution,
      maxZoom
    });

    // Fallback if specialized tile server errors
    tileLayer.on('tileerror', () => {
      if (layer !== 'streets' && (map as any)._mapPane) {
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      }
    });

    tileLayer.addTo(map);
    currentTileLayerRef.current = tileLayer;
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up any stale leaflet ID or HTML on the DOM element
    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }
    mapContainerRef.current.innerHTML = '';

    const validLat = typeof location.latitude === 'number' && !isNaN(location.latitude) ? location.latitude : 28.4595;
    const validLon = typeof location.longitude === 'number' && !isNaN(location.longitude) ? location.longitude : 77.0266;

    const map = L.map(mapContainerRef.current, {
      center: [validLat, validLon],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false
    });

    setTileLayer(map, activeLayer);

    const markerLayer = L.layerGroup().addTo(map);
    markerLayerRef.current = markerLayer;

    mapInstanceRef.current = map;

    // Listen to zoom events
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    // Handle ResizeObserver for resilient size adjustment in responsive grids
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (map && (map as any)._mapPane) {
          map.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    // Multiple staggered invalidations to guarantee tile rendering
    const timeouts = [
      setTimeout(() => { if (map && (map as any)._mapPane) map.invalidateSize(); }, 60),
      setTimeout(() => { if (map && (map as any)._mapPane) map.invalidateSize(); }, 200),
      setTimeout(() => { if (map && (map as any)._mapPane) map.invalidateSize(); }, 500),
      setTimeout(() => { if (map && (map as any)._mapPane) map.invalidateSize(); }, 1000)
    ];

    return () => {
      timeouts.forEach(clearTimeout);
      if (resizeObserver) resizeObserver.disconnect();
      try {
        map.stop();
        map.remove();
      } catch {
        // Safe disposal
      }
      mapInstanceRef.current = null;
      currentTileLayerRef.current = null;
      markerLayerRef.current = null;
    };
  }, []); // Run once on mount

  // Update tile layer when activeLayer changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && (map as any)._mapPane) {
      setTileLayer(map, activeLayer);
    }
  }, [activeLayer, setTileLayer]);

  // Update map view & markers when location or AQI changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerGroup = markerLayerRef.current;
    if (!map || !(map as any)._mapPane || !markerGroup) return;

    const lat = typeof location.latitude === 'number' && !isNaN(location.latitude) ? location.latitude : 28.4595;
    const lon = typeof location.longitude === 'number' && !isNaN(location.longitude) ? location.longitude : 77.0266;
    const displayAqi = typeof aqi === 'number' && !isNaN(aqi) ? aqi : 75;
    const cpcb = getIndiaCpcbCategory(displayAqi);

    try {
      map.setView([lat, lon], map.getZoom() || 10, { animate: false });
      map.invalidateSize();

      markerGroup.clearLayers();

      // Primary Pulsing City Beacon Marker
      const liveIcon = L.divIcon({
        className: 'local-terrain-pin',
        html: `
          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 34px; height: 34px; background: ${cpcb.color}40; border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 20px; height: 20px; background: ${cpcb.color}; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 12px ${cpcb.color}; display: flex; align-items: center; justify-content: center;">
              <div style="width: 5px; height: 5px; background: #ffffff; border-radius: 50%;"></div>
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const cityMarker = L.marker([lat, lon], { icon: liveIcon }).addTo(markerGroup);
      cityMarker.bindPopup(`
        <div style="color: #0f172a; font-family: sans-serif; padding: 4px; min-width: 130px;">
          <span style="font-size: 10px; font-weight: bold; color: ${cpcb.color}; text-transform: uppercase;">Monitored City</span>
          <div style="font-size: 13px; font-weight: bold; margin-top: 1px;">${location.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            AQI: <strong style="color: ${cpcb.color}; font-size: 12px;">${displayAqi}</strong> (${cpcb.label})
          </div>
        </div>
      `);

      // Nearby official monitoring stations within ~100km
      if (Array.isArray(INDIA_MAJOR_STATIONS)) {
        INDIA_MAJOR_STATIONS.forEach((station) => {
          const dist = Math.sqrt(Math.pow(station.latitude - lat, 2) + Math.pow(station.longitude - lon, 2));
          if (dist > 0.05 && dist < 1.0) {
            const stCpcb = getIndiaCpcbCategory(station.approxAqi);
            const stIcon = L.divIcon({
              className: 'nearby-st-pin',
              html: `
                <div style="cursor: pointer; display: flex; flex-direction: column; align-items: center;">
                  <div style="background: ${stCpcb.color}; color: #000; font-family: monospace; font-size: 8px; font-weight: 900; padding: 1px 3px; border-radius: 4px; border: 1px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.5);">
                    ${station.approxAqi}
                  </div>
                  <div style="width: 5px; height: 5px; background: ${stCpcb.color}; border: 1px solid white; border-radius: 50%; margin-top: -1px;"></div>
                </div>
              `,
              iconSize: [28, 20],
              iconAnchor: [14, 15]
            });

            const stM = L.marker([station.latitude, station.longitude], { icon: stIcon }).addTo(markerGroup);
            stM.bindPopup(`
              <div style="color: #0f172a; font-family: sans-serif; padding: 4px;">
                <div style="font-size: 9px; font-weight: bold; color: #0284c7; text-transform: uppercase;">${station.agency} CAAQMS</div>
                <strong style="font-size: 11px;">${station.name}</strong><br/>
                <span style="font-size: 10px; color: #475569;">AQI: <strong>${station.approxAqi}</strong> (${stCpcb.label})</span>
              </div>
            `);
          }
        });
      }
    } catch {
      // Safe no-op
    }
  }, [location.latitude, location.longitude, location.name, aqi]);

  const handleZoomIn = () => {
    const map = mapInstanceRef.current;
    if (map && (map as any)._mapPane) {
      map.zoomIn();
      map.invalidateSize();
    }
  };

  const handleZoomOut = () => {
    const map = mapInstanceRef.current;
    if (map && (map as any)._mapPane) {
      map.zoomOut();
      map.invalidateSize();
    }
  };

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (map && (map as any)._mapPane) {
      const lat = typeof location.latitude === 'number' && !isNaN(location.latitude) ? location.latitude : 28.4595;
      const lon = typeof location.longitude === 'number' && !isNaN(location.longitude) ? location.longitude : 77.0266;
      map.setView([lat, lon], 10, { animate: false });
      map.invalidateSize();
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden shadow-xl space-y-3.5">
      {/* Card Header with Real-Time Coordinates & Full Map Link */}
      <div className="flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-inner">
            <Mountain className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Local Geospatial Terrain
              </h4>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 font-mono font-bold uppercase border border-teal-500/30">
                Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              {location.latitude.toFixed(2)}°N, {location.longitude.toFixed(2)}°E • {location.name}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenFullMap}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-teal-300 text-[11px] font-bold flex items-center gap-1.5 border border-slate-700 shadow-md transition-all cursor-pointer hover:border-teal-500/40"
          title="Open complete interactive GIS map"
        >
          <Maximize2 className="w-3.5 h-3.5 text-teal-400" />
          <span>Full Map</span>
        </button>
      </div>

      {/* Layer Switcher Bar: Terrain (Topo) | Satellite | Streets */}
      <div className="flex items-center justify-between gap-1 z-20 bg-slate-950/80 p-1 rounded-xl border border-slate-800/90 text-[10px]">
        <span className="text-slate-500 font-bold px-1.5 hidden sm:inline">Layer:</span>
        <div className="flex items-center gap-1 w-full sm:w-auto">
          <button
            onClick={() => setActiveLayer('terrain')}
            className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeLayer === 'terrain'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Topographic elevation and terrain relief"
          >
            <Mountain className="w-3 h-3" />
            <span>Terrain</span>
          </button>

          <button
            onClick={() => setActiveLayer('satellite')}
            className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeLayer === 'satellite'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Real satellite aerial imagery"
          >
            <Satellite className="w-3 h-3" />
            <span>Satellite</span>
          </button>

          <button
            onClick={() => setActiveLayer('streets')}
            className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeLayer === 'streets'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Standard street and road network map"
          >
            <MapIcon className="w-3 h-3" />
            <span>Street</span>
          </button>
        </div>
      </div>

      {/* Mini Leaflet Map Container with Guaranteed CSS Height */}
      <div className="relative w-full h-52 min-h-[208px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
        <div 
          ref={mapContainerRef} 
          className="w-full h-full z-10" 
          style={{ width: '100%', height: '100%', minHeight: '208px' }} 
        />

        {/* Floating Map Controls Overlay (Top Right: Zoom In/Out, Recenter) */}
        <div className="absolute top-2.5 right-2.5 z-20 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-slate-950/90 hover:bg-slate-900 text-slate-200 hover:text-white border border-slate-700/80 shadow-md transition-colors cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-slate-950/90 hover:bg-slate-900 text-slate-200 hover:text-white border border-slate-700/80 shadow-md transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRecenter}
            className="p-1.5 rounded-lg bg-slate-950/90 hover:bg-slate-900 text-teal-400 hover:text-teal-300 border border-slate-700/80 shadow-md transition-colors cursor-pointer"
            title="Recenter to active city"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Left: Quick Legend Badge */}
        <div className="absolute bottom-2.5 left-2.5 z-20 px-2 py-1 rounded-lg bg-slate-950/90 backdrop-blur-md border border-slate-800 text-[9px] text-slate-300 flex items-center gap-1.5 shadow-md">
          <span 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: getIndiaCpcbCategory(aqi ?? 75).color }} 
          />
          <span className="font-bold text-white">{location.name}</span>
          <span className="text-slate-400 font-mono">AQI {aqi ?? 'Live'}</span>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <button
        onClick={onOpenFullMap}
        className="w-full py-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-teal-500/40 text-slate-300 hover:text-teal-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
      >
        <span>Explore Full Regional Map</span>
        <ExternalLink className="w-3 h-3 text-teal-400" />
      </button>
    </div>
  );
};
