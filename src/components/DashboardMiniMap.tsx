import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Layers, Maximize2, Navigation } from 'lucide-react';

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

export const DashboardMiniMap: React.FC<DashboardMiniMapProps> = ({
  location,
  aqi,
  onOpenFullMap
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const timers: NodeJS.Timeout[] = [];

    const map = L.map(mapContainerRef.current, {
      center: [location.latitude, location.longitude],
      zoom: 9,
      zoomControl: false,
      attributionControl: false
    });

    // CartoDB Dark Matter with OpenStreetMap tile error fallback
    const tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19
    });

    tiles.on('tileerror', () => {
      if ((map as any)._mapPane) {
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      }
    });

    tiles.addTo(map);

    // Custom city marker
    const customIcon = L.divIcon({
      className: 'minimap-marker',
      html: `
        <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 28px; height: 28px; background: rgba(20, 184, 166, 0.4); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 14px; height: 14px; background: #14B8A6; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 0 8px rgba(20,184,166,0.9);"></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker([location.latitude, location.longitude], { icon: customIcon })
      .addTo(map)
      .bindPopup(`<strong>${location.name}</strong><br/>AQI: ${aqi ?? 'Live'}`);

    markerRef.current = marker;
    mapInstanceRef.current = map;

    // Safe staggered size invalidations
    timers.push(
      setTimeout(() => {
        if (map && (map as any)._mapPane) {
          map.invalidateSize();
        }
      }, 150)
    );
    timers.push(
      setTimeout(() => {
        if (map && (map as any)._mapPane) {
          map.invalidateSize();
        }
      }, 400)
    );

    return () => {
      timers.forEach(clearTimeout);
      try {
        map.stop();
        map.remove();
      } catch (err) {
        // Safe cleanup
      }
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update position when location changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (!map || !(map as any)._mapPane) return;

    try {
      map.stop();
      map.setView([location.latitude, location.longitude], 9, { animate: false });
      if (marker) {
        marker.setLatLng([location.latitude, location.longitude]);
        marker.setPopupContent(`<strong>${location.name}</strong><br/>AQI: ${aqi ?? 'Live'}`);
      }
      map.invalidateSize();
    } catch {
      // Safe no-op
    }
  }, [location.latitude, location.longitude, location.name, aqi]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden space-y-3">
      <div className="flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Local Geospatial Terrain
            </h4>
            <p className="text-[11px] text-slate-400">
              {location.latitude.toFixed(2)}°N, {location.longitude.toFixed(2)}°E
            </p>
          </div>
        </div>

        <button
          onClick={onOpenFullMap}
          className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3 h-3 text-teal-400" />
          <span>Full Map</span>
        </button>
      </div>

      {/* Mini Leaflet Map Container */}
      <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Quick Action Overlay */}
        <div className="absolute bottom-2.5 right-2.5 z-20">
          <button
            onClick={() => {
              if (mapInstanceRef.current && (mapInstanceRef.current as any)._mapPane) {
                mapInstanceRef.current.setView([location.latitude, location.longitude], 9);
                mapInstanceRef.current.invalidateSize();
              }
            }}
            className="p-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md text-slate-300 hover:text-white border border-slate-700 shadow-md cursor-pointer"
            title="Recenter"
          >
            <Navigation className="w-3.5 h-3.5 text-teal-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
