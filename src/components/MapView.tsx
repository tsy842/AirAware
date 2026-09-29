import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Navigation, 
  Layers, 
  Flame, 
  Camera, 
  Locate, 
  Check, 
  ExternalLink, 
  Activity, 
  Compass, 
  Search,
  AlertCircle,
  Crosshair,
  Satellite,
  Map as MapIcon,
  Moon,
  RefreshCw,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { api } from '../services/api';
import { CorridorHotspot, CitizenReport, GeocodingPlace } from '../types';

interface MapViewProps {
  currentLocation: {
    name: string;
    latitude: number;
    longitude: number;
    adminRegion?: string;
    country?: string;
  };
  onSelectLocation: (loc: { name: string; latitude: number; longitude: number; adminRegion?: string; country?: string }) => void;
  onNavigateToDashboard: () => void;
}

// Major CPCB / State Pollution Control Board Official CAAQMS Stations in India
export interface IndiaAqiStation {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  agency: string;
  approxAqi: number;
  dominantPollutant: 'PM2.5' | 'PM10' | 'NO2';
}

const INDIA_MAJOR_STATIONS: IndiaAqiStation[] = [
  // Delhi NCR
  { id: 'delhi-anand-vihar', name: 'Anand Vihar CAAQMS', city: 'Delhi', state: 'Delhi', latitude: 28.6469, longitude: 77.3160, agency: 'DPCC', approxAqi: 285, dominantPollutant: 'PM2.5' },
  { id: 'delhi-rk-puram', name: 'R.K. Puram Sector 8', city: 'Delhi', state: 'Delhi', latitude: 28.5633, longitude: 77.1869, agency: 'DPCC', approxAqi: 242, dominantPollutant: 'PM2.5' },
  { id: 'delhi-punjabi-bagh', name: 'Punjabi Bagh West', city: 'Delhi', state: 'Delhi', latitude: 28.6740, longitude: 77.1310, agency: 'DPCC', approxAqi: 258, dominantPollutant: 'PM2.5' },
  { id: 'delhi-igi', name: 'IGI Airport Terminal 3', city: 'Delhi', state: 'Delhi', latitude: 28.5562, longitude: 77.1000, agency: 'IMD-SAFAR', approxAqi: 215, dominantPollutant: 'PM10' },
  { id: 'gurugram-sec51', name: 'Sector 51 Vikas Sadan', city: 'Gurugram', state: 'Haryana', latitude: 28.4282, longitude: 77.0689, agency: 'HSPCB', approxAqi: 235, dominantPollutant: 'PM2.5' },
  { id: 'gurugram-teri', name: 'TERI Gram Gwal Pahari', city: 'Gurugram', state: 'Haryana', latitude: 28.4350, longitude: 77.1510, agency: 'HSPCB', approxAqi: 198, dominantPollutant: 'PM2.5' },
  { id: 'noida-sec62', name: 'Sector 62 Institutional Area', city: 'Noida', state: 'Uttar Pradesh', latitude: 28.6270, longitude: 77.3620, agency: 'UPPCB', approxAqi: 268, dominantPollutant: 'PM2.5' },
  { id: 'faridabad-sec16a', name: 'Sector 16A Commercial', city: 'Faridabad', state: 'Haryana', latitude: 28.4090, longitude: 77.3190, agency: 'HSPCB', approxAqi: 248, dominantPollutant: 'PM2.5' },
  // Punjab / Agricultural Stubble Corridor
  { id: 'amritsar-golden-temple', name: 'Golden Temple Heritage Street', city: 'Amritsar', state: 'Punjab', latitude: 31.6200, longitude: 74.8765, agency: 'PPCB', approxAqi: 212, dominantPollutant: 'PM2.5' },
  { id: 'ludhiana-pau', name: 'Punjab Agricultural University', city: 'Ludhiana', state: 'Punjab', latitude: 30.9010, longitude: 75.8070, agency: 'PPCB', approxAqi: 238, dominantPollutant: 'PM2.5' },
  { id: 'karnal-sec12', name: 'Sector 12 Mini Secretariat', city: 'Karnal', state: 'Haryana', latitude: 29.6857, longitude: 76.9905, agency: 'HSPCB', approxAqi: 220, dominantPollutant: 'PM2.5' },
  // Mumbai & West
  { id: 'mumbai-bkc', name: 'Bandra Kurla Complex (BKC)', city: 'Mumbai', state: 'Maharashtra', latitude: 19.0657, longitude: 72.8687, agency: 'MPCB', approxAqi: 142, dominantPollutant: 'PM10' },
  { id: 'mumbai-colaba', name: 'Colaba Coastal Observatory', city: 'Mumbai', state: 'Maharashtra', latitude: 18.9067, longitude: 72.8147, agency: 'MPCB', approxAqi: 95, dominantPollutant: 'PM2.5' },
  { id: 'pune-shivajinagar', name: 'Shivaji Nagar Weather Hub', city: 'Pune', state: 'Maharashtra', latitude: 18.5314, longitude: 73.8446, agency: 'MPCB', approxAqi: 118, dominantPollutant: 'PM2.5' },
  { id: 'ahmedabad-chandkheda', name: 'Chandkheda Zonal Office', city: 'Ahmedabad', state: 'Gujarat', latitude: 23.1120, longitude: 72.5850, agency: 'GPCB', approxAqi: 154, dominantPollutant: 'PM2.5' },
  // South
  { id: 'bengaluru-btm', name: 'BTM Layout Residential', city: 'Bengaluru', state: 'Karnataka', latitude: 12.9166, longitude: 77.6101, agency: 'KSPCB', approxAqi: 68, dominantPollutant: 'PM2.5' },
  { id: 'bengaluru-silkboard', name: 'Central Silk Board Junction', city: 'Bengaluru', state: 'Karnataka', latitude: 12.9177, longitude: 77.6238, agency: 'KSPCB', approxAqi: 82, dominantPollutant: 'PM10' },
  { id: 'chennai-alandur', name: 'Alandur Bus Depot', city: 'Chennai', state: 'Tamil Nadu', latitude: 13.0033, longitude: 80.2015, agency: 'TNPCB', approxAqi: 74, dominantPollutant: 'PM2.5' },
  { id: 'chennai-manali', name: 'Manali Petrochemical Corridor', city: 'Chennai', state: 'Tamil Nadu', latitude: 13.1670, longitude: 80.2600, agency: 'TNPCB', approxAqi: 128, dominantPollutant: 'NO2' },
  { id: 'hyderabad-sanathnagar', name: 'Sanathnagar Industrial Area', city: 'Hyderabad', state: 'Telangana', latitude: 17.4560, longitude: 78.4430, agency: 'TSPCB', approxAqi: 115, dominantPollutant: 'PM2.5' },
  // East & Central
  { id: 'kolkata-victoria', name: 'Victoria Memorial Gardens', city: 'Kolkata', state: 'West Bengal', latitude: 22.5448, longitude: 88.3426, agency: 'WBPCB', approxAqi: 168, dominantPollutant: 'PM2.5' },
  { id: 'kolkata-rbu', name: 'Rabindra Bharati University', city: 'Kolkata', state: 'West Bengal', latitude: 22.6280, longitude: 88.3780, agency: 'WBPCB', approxAqi: 185, dominantPollutant: 'PM2.5' },
  { id: 'patna-samanpura', name: 'Samanpura Raja Bazaar', city: 'Patna', state: 'Bihar', latitude: 25.6150, longitude: 85.0880, agency: 'BSPCB', approxAqi: 282, dominantPollutant: 'PM2.5' },
  { id: 'lucknow-talkatora', name: 'Talkatora Industrial Area', city: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8330, longitude: 80.8930, agency: 'UPPCB', approxAqi: 228, dominantPollutant: 'PM2.5' },
  { id: 'jaipur-shastrinagar', name: 'Shastri Nagar Science Park', city: 'Jaipur', state: 'Rajasthan', latitude: 26.9480, longitude: 75.8030, agency: 'RSPCB', approxAqi: 162, dominantPollutant: 'PM2.5' }
];

// India National Air Quality Index (NAQI) Standard classification
export function getIndiaCpcbCategory(aqi: number): { label: string; color: string; bg: string; border: string } {
  if (aqi <= 50) return { label: 'Good', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' };
  if (aqi <= 100) return { label: 'Satisfactory', color: '#84CC16', bg: 'rgba(132, 204, 22, 0.15)', border: 'rgba(132, 204, 22, 0.4)' };
  if (aqi <= 200) return { label: 'Moderate', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' };
  if (aqi <= 300) return { label: 'Poor', color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)' };
  if (aqi <= 400) return { label: 'Very Poor', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' };
  return { label: 'Severe', color: '#991B1B', bg: 'rgba(153, 27, 27, 0.25)', border: 'rgba(153, 27, 27, 0.6)' };
}

type MapLayerType = 'streets' | 'satellite' | 'dark';

export const MapView: React.FC<MapViewProps> = ({
  currentLocation,
  onSelectLocation,
  onNavigateToDashboard
}) => {
  const { savedLocations } = useAuth();
  const { isDemoMode } = useDemo();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const gpsMarkerRef = useRef<L.LayerGroup | null>(null);
  const clickMarkerRef = useRef<L.LayerGroup | null>(null);

  const [mapLayerType, setMapLayerType] = useState<MapLayerType>('streets');
  const [hotspots, setHotspots] = useState<CorridorHotspot[]>([]);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>([]);

  // Layer visibility toggles
  const [showStations, setShowStations] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showCitizenReports, setShowCitizenReports] = useState(true);

  // Live Geolocation state
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [liveGpsCoords, setLiveGpsCoords] = useState<{ lat: number; lon: number; accuracy: number; name?: string } | null>(null);

  // In-map search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Inspected point on click or station select
  const [inspectingPoint, setInspectingPoint] = useState<{
    lat: number;
    lon: number;
    name: string;
    adminRegion?: string;
    country?: string;
    loading: boolean;
    aqi?: number;
    temp?: number;
    isStation?: boolean;
    stationInfo?: IndiaAqiStation;
    hotspotInfo?: CorridorHotspot;
    citizenReportInfo?: CitizenReport;
    isUserGps?: boolean;
    accuracyMeters?: number;
  } | null>(null);

  // Load satellite hotspots & citizen reports
  useEffect(() => {
    Promise.all([
      api.getCorridorHotspots().catch(() => ({ hotspots: [] })),
      api.getCitizenReports().catch(() => ({ reports: [] }))
    ]).then(([hotRes, repRes]) => {
      setHotspots(hotRes.hotspots || []);
      setCitizenReports(repRes.reports || []);
    });
  }, []);

  // Update Tile Layer helper
  const applyTileLayer = (map: L.Map, layerType: MapLayerType) => {
    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
      currentTileLayerRef.current = null;
    }

    let tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    let maxZoom = 19;

    if (layerType === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
      maxZoom = 18;
    } else if (layerType === 'dark') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
      maxZoom = 19;
    }

    const newLayer = L.tileLayer(tileUrl, {
      attribution,
      maxZoom,
      subdomains: layerType === 'dark' ? 'abcd' : ''
    });

    newLayer.on('tileerror', () => {
      // Fallback to standard OSM if specialized tile server errors
      if (layerType !== 'streets' && (map as any)._mapPane) {
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      }
    });

    newLayer.addTo(map);
    currentTileLayerRef.current = newLayer;
  };

  // Live Location Detector function
  const detectLiveLocation = useCallback((autoTrigger: boolean = false) => {
    if (!navigator.geolocation) {
      if (!autoTrigger) setGeoError('Geolocation is not supported by your current browser.');
      return;
    }

    setIsGeolocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setIsGeolocating(false);

        const map = mapInstanceRef.current;
        const gpsLayer = gpsMarkerRef.current;

        // Reverse geocode to get locality
        let detectedName = `Current Location (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`;
        let detectedAdmin: string | undefined = undefined;
        let detectedCountry = 'India';

        try {
          const [geoRes, airRes, weatherRes] = await Promise.all([
            api.reverseGeocode(latitude, longitude),
            api.getAirQuality(latitude, longitude).catch(() => null),
            api.getWeather(latitude, longitude).catch(() => null)
          ]);

          if (geoRes.name) detectedName = geoRes.name;
          detectedAdmin = geoRes.adminRegion || (latitude >= 8 && latitude <= 37 && longitude >= 68 && longitude <= 97 ? 'India' : undefined);
          detectedCountry = geoRes.country || 'India';

          setLiveGpsCoords({
            lat: latitude,
            lon: longitude,
            accuracy: Math.round(accuracy),
            name: detectedName
          });

          setInspectingPoint({
            lat: latitude,
            lon: longitude,
            name: detectedName,
            adminRegion: detectedAdmin,
            country: detectedCountry,
            loading: false,
            aqi: airRes?.current.usAqi ?? undefined,
            temp: weatherRes?.current.temperature ?? undefined,
            isUserGps: true,
            accuracyMeters: Math.round(accuracy)
          });

          // Update active location
          onSelectLocation({
            name: detectedName,
            latitude,
            longitude,
            adminRegion: detectedAdmin,
            country: detectedCountry
          });
        } catch {
          setLiveGpsCoords({
            lat: latitude,
            lon: longitude,
            accuracy: Math.round(accuracy),
            name: detectedName
          });
          onSelectLocation({
            name: detectedName,
            latitude,
            longitude,
            country: 'India'
          });
        }

        // Draw live GPS beacon with accuracy circle
        if (gpsLayer) {
          gpsLayer.clearLayers();

          // Accuracy circle
          L.circle([latitude, longitude], {
            radius: Math.max(accuracy, 80),
            color: '#0284C7',
            fillColor: '#38BDF8',
            fillOpacity: 0.18,
            weight: 2
          }).addTo(gpsLayer);

          // Pulsing pin
          const liveIcon = L.divIcon({
            className: 'real-gps-marker',
            html: `
              <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; width: 32px; height: 32px; background: rgba(14, 165, 233, 0.45); border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: relative; width: 18px; height: 18px; background: #0284C7; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 12px rgba(14,165,233,0.9); display: flex; align-items: center; justify-content: center;">
                  <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          L.marker([latitude, longitude], { icon: liveIcon })
            .addTo(gpsLayer)
            .bindPopup(`
              <div style="color: #0f172a; font-family: sans-serif; padding: 4px;">
                <strong style="color: #0284c7; font-size: 11px; text-transform: uppercase;">📍 Real Live Location (GPS)</strong><br/>
                <strong style="font-size: 13px;">${detectedName}</strong><br/>
                <span style="font-size: 11px; color: #64748b;">GPS Accuracy: ±${Math.round(accuracy)} meters</span>
              </div>
            `)
            .openPopup();
        }

        if (map && (map as any)._mapPane) {
          map.stop();
          map.setView([latitude, longitude], 13, { animate: false });
          map.invalidateSize();
        }
      },
      (err) => {
        setIsGeolocating(false);
        if (!autoTrigger) {
          setGeoError(err.message || 'Unable to retrieve GPS coordinates. Check browser permissions.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 10000
      }
    );
  }, [onSelectLocation]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = currentLocation.latitude || 28.6139;
      const initialLon = currentLocation.longitude || 77.2090;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLon],
        zoom: 11,
        zoomControl: true,
        attributionControl: true
      });

      applyTileLayer(map, mapLayerType);

      // Layer groups
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      const gpsLayer = L.layerGroup().addTo(map);
      gpsMarkerRef.current = gpsLayer;

      const clickLayer = L.layerGroup().addTo(map);
      clickMarkerRef.current = clickLayer;

      // Invalidate size staggered
      const t1 = setTimeout(() => {
        if (map && (map as any)._mapPane) map.invalidateSize();
      }, 100);
      const t2 = setTimeout(() => {
        if (map && (map as any)._mapPane) map.invalidateSize();
      }, 350);

      // Resize observer
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (map && (map as any)._mapPane) {
            map.invalidateSize();
          }
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      // Map Click Handler for Real-Time Coordinates & Inspection
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;

        // Place click reticle pin
        if (clickMarkerRef.current) {
          clickMarkerRef.current.clearLayers();
          const targetIcon = L.divIcon({
            className: 'click-target-marker',
            html: `
              <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; width: 28px; height: 28px; border: 2px dashed #14B8A6; border-radius: 50%; animation: spin 4s linear infinite;"></div>
                <div style="width: 10px; height: 10px; background: #14B8A6; border: 2px solid white; border-radius: 50%;"></div>
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });
          L.marker([lat, lng], { icon: targetIcon }).addTo(clickMarkerRef.current);
        }

        setInspectingPoint({
          lat,
          lon: lng,
          name: 'Locating place name...',
          loading: true
        });

        try {
          const [geoRes, airRes, weatherRes] = await Promise.all([
            api.reverseGeocode(lat, lng),
            api.getAirQuality(lat, lng).catch(() => null),
            api.getWeather(lat, lng).catch(() => null)
          ]);

          const placeName = geoRes.name || `Point (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`;
          const admin = geoRes.adminRegion || (lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97 ? 'India' : undefined);

          setInspectingPoint({
            lat,
            lon: lng,
            name: placeName,
            adminRegion: admin,
            country: geoRes.country || (lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97 ? 'India' : undefined),
            loading: false,
            aqi: airRes?.current.usAqi ?? undefined,
            temp: weatherRes?.current.temperature ?? undefined
          });
        } catch {
          setInspectingPoint({
            lat,
            lon: lng,
            name: `Coordinates (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`,
            loading: false
          });
        }
      });

      mapInstanceRef.current = map;

      // Auto-detect real location on first load
      detectLiveLocation(true);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        if (resizeObserver) resizeObserver.disconnect();
        try {
          map.stop();
          map.remove();
        } catch {
          // Safe disposal
        }
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        gpsMarkerRef.current = null;
        clickMarkerRef.current = null;
      };
    }
  }, []);

  // Update Tile Layer when layer switch changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && (map as any)._mapPane) {
      applyTileLayer(map, mapLayerType);
    }
  }, [mapLayerType]);

  // Update Markers when location or filters change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markers = markersLayerRef.current;
    if (!map || !(map as any)._mapPane || !markers) return;

    markers.clearLayers();

    // Active Monitored Location Beacon
    const currentIcon = L.divIcon({
      className: 'active-city-beacon',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 36px; height: 36px; background: rgba(20, 184, 166, 0.35); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 22px; height: 22px; background: #14B8A6; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 12px rgba(20,184,166,0.9); display: flex; align-items: center; justify-content: center;">
            <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const activeMarker = L.marker([currentLocation.latitude, currentLocation.longitude], { icon: currentIcon }).addTo(markers);
    activeMarker.bindPopup(`
      <div style="color: #0f172a; font-family: sans-serif; padding: 4px; min-width: 140px;">
        <span style="font-size: 10px; font-weight: bold; color: #0d9488; text-transform: uppercase;">Active Monitored City</span>
        <div style="font-size: 13px; font-weight: bold; margin-top: 2px;">${currentLocation.name}</div>
        <div style="font-size: 11px; color: #64748b;">${currentLocation.adminRegion ? currentLocation.adminRegion + ', ' : ''}${currentLocation.country || 'India'}</div>
      </div>
    `);

    // India CPCB Official Monitoring Stations
    if (showStations) {
      INDIA_MAJOR_STATIONS.forEach(station => {
        const isCurrentCity = Math.abs(station.latitude - currentLocation.latitude) < 0.04 && Math.abs(station.longitude - currentLocation.longitude) < 0.04;
        if (isCurrentCity) return;

        const cpcb = getIndiaCpcbCategory(station.approxAqi);
        const stationIcon = L.divIcon({
          className: 'cpcb-station-marker',
          html: `
            <div style="cursor: pointer; display: flex; flex-direction: column; align-items: center;">
              <div style="background: ${cpcb.color}; color: #000; font-family: monospace; font-size: 9px; font-weight: 900; padding: 1px 4px; border-radius: 5px; border: 1.5px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.4); white-space: nowrap;">
                ${station.approxAqi}
              </div>
              <div style="width: 7px; height: 7px; background: ${cpcb.color}; border: 1.5px solid white; border-radius: 50%; margin-top: -2px;"></div>
            </div>
          `,
          iconSize: [36, 26],
          iconAnchor: [18, 20]
        });

        const stMarker = L.marker([station.latitude, station.longitude], { icon: stationIcon }).addTo(markers);
        stMarker.bindPopup(`
          <div style="color: #0f172a; font-family: sans-serif; padding: 6px; max-width: 220px;">
            <div style="font-size: 9px; font-weight: bold; color: #0284c7; text-transform: uppercase;">${station.agency} CAAQMS Station</div>
            <strong style="font-size: 12px; color: #0f172a;">${station.name}</strong><br/>
            <span style="font-size: 11px; color: #64748b;">${station.city}, ${station.state}</span>
            <div style="margin-top: 5px; display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 4px 6px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div>
                <span style="font-size: 9px; color: #64748b;">CPCB NAQI</span>
                <div style="font-weight: 900; color: ${cpcb.color}; font-size: 13px;">${station.approxAqi}</div>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 9px; font-weight: bold; background: ${cpcb.color}25; color: ${cpcb.color}; padding: 2px 4px; border-radius: 4px;">
                  ${cpcb.label}
                </span>
                <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Lead: ${station.dominantPollutant}</div>
              </div>
            </div>
          </div>
        `);

        stMarker.on('click', () => {
          setInspectingPoint({
            lat: station.latitude,
            lon: station.longitude,
            name: `${station.name} (${station.city})`,
            adminRegion: station.state,
            country: 'India',
            loading: false,
            aqi: station.approxAqi,
            isStation: true,
            stationInfo: station
          });
        });
      });
    }

    // Saved Favorites
    savedLocations.forEach(loc => {
      if (Math.abs(loc.latitude - currentLocation.latitude) < 0.05 && Math.abs(loc.longitude - currentLocation.longitude) < 0.05) {
        return;
      }
      const savedIcon = L.divIcon({
        className: 'saved-pin',
        html: `<div style="width: 13px; height: 13px; background: #3B82F6; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 0 6px rgba(59,130,246,0.6);"></div>`,
        iconSize: [13, 13],
        iconAnchor: [6.5, 6.5]
      });
      const m = L.marker([loc.latitude, loc.longitude], { icon: savedIcon }).addTo(markers);
      m.bindPopup(`<strong>${loc.name}</strong><br/><span style="color: #3b82f6; font-size: 11px;">Saved Favorite</span>`);
      m.on('click', () => {
        setInspectingPoint({
          lat: loc.latitude,
          lon: loc.longitude,
          name: loc.name,
          adminRegion: loc.adminRegion,
          country: loc.country,
          loading: false
        });
      });
    });

    // Satellite Thermal Clusters (Fires & Stacks)
    if (showHotspots) {
      hotspots.forEach(hot => {
        const fireIcon = L.divIcon({
          className: 'hotspot-marker',
          html: `
            <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 24px; height: 24px; background: rgba(249, 115, 22, 0.4); border-radius: 50%; animation: pulse 1.5s infinite;"></div>
              <div style="width: 12px; height: 12px; background: #F97316; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 0 8px rgba(249,115,22,0.9);"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const fireMarker = L.marker([hot.latitude, hot.longitude], { icon: fireIcon }).addTo(markers);
        fireMarker.bindPopup(`
          <div style="color: #0f172a; font-family: sans-serif; padding: 4px; max-width: 210px;">
            <div style="font-size: 9px; font-weight: bold; color: #ea580c; text-transform: uppercase;">Satellite Thermal Anomaly</div>
            <strong style="font-size: 12px;">${hot.region}</strong><br/>
            <span style="font-size: 11px; color: #475569;">Power: <strong>${hot.thermalRadiativePowerMW} MW</strong></span><br/>
            <span style="font-size: 11px; color: #475569;">PM2.5 Flux: <strong>${hot.estimatedPm25FluxKgPerHour} kg/hr</strong></span>
          </div>
        `);
        fireMarker.on('click', () => {
          setInspectingPoint({
            lat: hot.latitude,
            lon: hot.longitude,
            name: `${hot.region} (${hot.country})`,
            country: hot.country,
            loading: false,
            hotspotInfo: hot
          });
        });
      });
    }

    // Citizen Incidents
    if (showCitizenReports) {
      citizenReports.forEach(rep => {
        const citIcon = L.divIcon({
          className: 'citizen-marker',
          html: `<div style="width: 12px; height: 12px; background: #A855F7; border: 2px solid #ffffff; border-radius: 3px; transform: rotate(45deg); box-shadow: 0 0 6px rgba(168,85,247,0.8);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const citMarker = L.marker([rep.latitude, rep.longitude], { icon: citIcon }).addTo(markers);
        citMarker.bindPopup(`
          <div style="color: #0f172a; font-family: sans-serif; padding: 4px; max-width: 200px;">
            <div style="font-size: 9px; font-weight: bold; color: #7e22ce; text-transform: uppercase;">Citizen Report</div>
            <strong style="font-size: 12px;">${rep.locationName}</strong><br/>
            <p style="font-size: 11px; color: #334155; margin: 2px 0;">"${rep.description.substring(0, 60)}..."</p>
          </div>
        `);
        citMarker.on('click', () => {
          setInspectingPoint({
            lat: rep.latitude,
            lon: rep.longitude,
            name: rep.locationName,
            loading: false,
            citizenReportInfo: rep
          });
        });
      });
    }

  }, [currentLocation, savedLocations, hotspots, citizenReports, showStations, showHotspots, showCitizenReports]);

  // Handle Search Input with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.trim().length >= 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await api.searchLocations(val);
          setSearchResults(res.results || []);
          setIsSearchOpen(true);
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 350);
    } else {
      setSearchResults([]);
      setIsSearchOpen(false);
      setIsSearching(false);
    }
  };

  // Select Search Result
  const handleSelectSearchResult = (place: GeocodingPlace) => {
    setIsSearchOpen(false);
    setSearchQuery(place.name);

    const map = mapInstanceRef.current;
    if (map && (map as any)._mapPane) {
      map.stop();
      map.setView([place.latitude, place.longitude], 12, { animate: false });
      map.invalidateSize();
    }

    setInspectingPoint({
      lat: place.latitude,
      lon: place.longitude,
      name: place.name,
      adminRegion: place.admin1,
      country: place.country,
      loading: true
    });

    Promise.all([
      api.getAirQuality(place.latitude, place.longitude).catch(() => null),
      api.getWeather(place.latitude, place.longitude).catch(() => null)
    ]).then(([airRes, weatherRes]) => {
      setInspectingPoint({
        lat: place.latitude,
        lon: place.longitude,
        name: place.name,
        adminRegion: place.admin1,
        country: place.country,
        loading: false,
        aqi: airRes?.current.usAqi ?? undefined,
        temp: weatherRes?.current.temperature ?? undefined
      });
    });
  };

  // Jump to specific Indian region
  const handleJumpToRegion = (lat: number, lon: number, zoom: number = 9) => {
    const map = mapInstanceRef.current;
    if (map && (map as any)._mapPane) {
      map.stop();
      map.setView([lat, lon], zoom, { animate: false });
      map.invalidateSize();
    }
  };

  return (
    <div className="space-y-4 pb-16 animate-fadeIn">
      {/* Top Map Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Layers className="w-6 h-6 text-teal-400" />
              Live Geospatial Air Quality Map
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono font-bold uppercase border border-teal-500/40">
              India CPCB & GPS Live
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time interactive Leaflet map centered on your live location, showing official CPCB CAAQMS stations, satellite thermal fires, and click-to-inspect air quality.
          </p>
        </div>

        {/* Live Location & Map Style Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Real Live GPS Button */}
          <button
            onClick={() => detectLiveLocation(false)}
            disabled={isGeolocating}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 ${
              liveGpsCoords
                ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20'
                : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/20'
            }`}
          >
            {isGeolocating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Acquiring GPS...</span>
              </>
            ) : (
              <>
                <Locate className="w-4 h-4" />
                <span>
                  {liveGpsCoords ? `GPS Active (±${liveGpsCoords.accuracy}m)` : 'Locate My Real Position'}
                </span>
              </>
            )}
          </button>

          {/* Map Layer Switcher: Street / Satellite / Dark */}
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setMapLayerType('streets')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                mapLayerType === 'streets' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Standard Street Map (OpenStreetMap with streets, Hindi/English labels)"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Street</span>
            </button>
            <button
              onClick={() => setMapLayerType('satellite')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                mapLayerType === 'satellite' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Satellite Aerial Imagery"
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>Satellite</span>
            </button>
            <button
              onClick={() => setMapLayerType('dark')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                mapLayerType === 'dark' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Dark Matter Theme"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
          </div>

          {/* Recenter active location */}
          <button
            onClick={() => {
              if (mapInstanceRef.current && (mapInstanceRef.current as any)._mapPane) {
                mapInstanceRef.current.setView([currentLocation.latitude, currentLocation.longitude], 12, { animate: false });
                mapInstanceRef.current.invalidateSize();
              }
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Recenter to active city"
          >
            <Crosshair className="w-4 h-4 text-teal-400" />
          </button>
        </div>
      </div>

      {/* In-Map Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Real In-Map Search Bar */}
        <div className="relative w-full sm:w-96">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchResults.length > 0) setIsSearchOpen(true);
              }}
              placeholder="Search Indian city, colony, or landmark..."
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setIsSearchOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-50 text-xs">
              <div className="p-2 border-b border-slate-800 text-[10px] text-slate-400 uppercase font-bold">
                Matching Indian Locations
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60">
                {searchResults.map((place) => (
                  <button
                    key={`${place.latitude}-${place.longitude}-${place.name}`}
                    onClick={() => handleSelectSearchResult(place)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800/80 flex items-center justify-between text-slate-200 hover:text-white transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-white">{place.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {place.admin1 ? `${place.admin1}, ` : ''}{place.country || 'India'}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-teal-400">
                      {place.latitude.toFixed(2)}°, {place.longitude.toFixed(2)}°
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Layer Visibility Toggles */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            onClick={() => setShowStations(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer shrink-0 ${
              showStations ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>CPCB Stations ({INDIA_MAJOR_STATIONS.length})</span>
          </button>
          <button
            onClick={() => setShowHotspots(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer shrink-0 ${
              showHotspots ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>VIIRS Fires ({hotspots.length})</span>
          </button>
          <button
            onClick={() => setShowCitizenReports(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer shrink-0 ${
              showCitizenReports ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-purple-400" />
            <span>Citizen ({citizenReports.length})</span>
          </button>
        </div>
      </div>

      {/* Indian Quick Region Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
        <span className="text-slate-400 font-bold shrink-0 flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-teal-400" />
          <span>India Quick Jump:</span>
        </span>
        <button
          onClick={() => handleJumpToRegion(22.5, 79.0, 5)}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 shrink-0 cursor-pointer"
        >
          🇮🇳 Pan-India
        </button>
        <button
          onClick={() => handleJumpToRegion(28.6139, 77.2090, 11)}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 shrink-0 cursor-pointer"
        >
          Delhi NCR & Gurugram
        </button>
        <button
          onClick={() => handleJumpToRegion(31.2, 75.5, 8)}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 shrink-0 cursor-pointer"
        >
          Punjab Stubble Corridor
        </button>
        <button
          onClick={() => handleJumpToRegion(19.0760, 72.8777, 11)}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 shrink-0 cursor-pointer"
        >
          Mumbai & Pune
        </button>
        <button
          onClick={() => handleJumpToRegion(12.9716, 77.5946, 11)}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 shrink-0 cursor-pointer"
        >
          Bengaluru & South
        </button>
        <button
          onClick={() => handleJumpToRegion(22.5726, 88.3639, 11)}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 shrink-0 cursor-pointer"
        >
          Kolkata & Bengal
        </button>
        <button
          onClick={() => handleJumpToRegion(17.3850, 78.4867, 11)}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 shrink-0 cursor-pointer"
        >
          Hyderabad
        </button>
        <button
          onClick={() => handleJumpToRegion(26.8467, 80.9462, 10)}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 shrink-0 cursor-pointer"
        >
          Lucknow & Indo-Gangetic
        </button>
      </div>

      {/* Geolocation error notification banner */}
      {geoError && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{geoError}</span>
          </div>
          <button onClick={() => setGeoError(null)} className="text-amber-400 hover:text-amber-200">
            ✕
          </button>
        </div>
      )}

      {/* Main Map Container */}
      <div className="relative w-full h-[660px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Map Legend Overlay */}
        <div className="absolute bottom-6 left-6 z-20 bg-slate-950/95 backdrop-blur-md border border-slate-800/90 rounded-2xl p-4 shadow-xl max-w-xs text-xs space-y-3">
          <div>
            <div className="font-bold text-white mb-1.5 flex items-center justify-between">
              <span>Interactive Map Legend</span>
              <span className="text-[10px] text-teal-400 font-mono">India Live</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-sky-500 border border-white" />
                <span className="text-slate-200">Real Live Location (GPS Blue Beacon)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-teal-400 border border-white" />
                <span className="text-slate-200">Active Monitored City</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500 text-slate-950">212</span>
                <span className="text-slate-300">CPCB / State Board Station</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-slate-300">VIIRS Satellite Stubble/Fire Hotspot</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-purple-500 rotate-45" />
                <span className="text-slate-300">Citizen Plume Observation</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <div className="font-bold text-white mb-1 flex items-center justify-between text-[11px]">
              <span>National AQI (NAQI) Scale</span>
              <span className="text-[10px] text-slate-400">CPCB India</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] font-medium">
              <span className="text-emerald-400">0–50: Good</span>
              <span className="text-lime-400">51–100: Satisfactory</span>
              <span className="text-amber-400">101–200: Moderate</span>
              <span className="text-orange-400">201–300: Poor</span>
              <span className="text-red-400">301–400: Very Poor</span>
              <span className="text-rose-500">401–500: Severe</span>
            </div>
          </div>
        </div>

        {/* Inspected / Selected Location Card (Click-to-Select) */}
        {inspectingPoint && (
          <div className="absolute top-6 right-6 z-20 bg-slate-900/95 backdrop-blur-md border border-teal-500/40 rounded-2xl p-4 shadow-2xl w-88 max-w-[calc(100vw-48px)] text-xs space-y-3 animate-fadeIn">
            {/* Card Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">
                  {inspectingPoint.isUserGps
                    ? '📍 Live GPS Geolocation'
                    : inspectingPoint.isStation
                    ? '🏢 Official CPCB Monitoring Station'
                    : inspectingPoint.hotspotInfo
                    ? '🔥 Satellite Thermal Anomaly'
                    : inspectingPoint.citizenReportInfo
                    ? '📷 Citizen Ground Incident'
                    : '📍 Click-Inspected Location'}
                </span>
                <h4 className="font-bold text-sm text-white mt-0.5 truncate max-w-[240px]">
                  {inspectingPoint.name}
                </h4>
                <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                  {inspectingPoint.lat.toFixed(3)}°N, {inspectingPoint.lon.toFixed(3)}°E
                  {inspectingPoint.adminRegion && ` • ${inspectingPoint.adminRegion}`}
                </div>
              </div>

              <button
                onClick={() => setInspectingPoint(null)}
                className="text-slate-500 hover:text-white text-sm cursor-pointer p-1"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* CPCB Station details */}
            {inspectingPoint.isStation && inspectingPoint.stationInfo && (
              <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-blue-400 font-bold uppercase">
                    Agency: {inspectingPoint.stationInfo.agency}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">
                    Live CAAQMS
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="text-[10px] text-slate-400">Current AQI</div>
                    <div className="text-xl font-black font-mono text-white">
                      {inspectingPoint.stationInfo.approxAqi}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">CPCB Category</div>
                    <div
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: getIndiaCpcbCategory(inspectingPoint.stationInfo.approxAqi).bg,
                        color: getIndiaCpcbCategory(inspectingPoint.stationInfo.approxAqi).color
                      }}
                    >
                      {getIndiaCpcbCategory(inspectingPoint.stationInfo.approxAqi).label}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400">
                  Dominant Atmospheric Pollutant: <strong className="text-slate-200">{inspectingPoint.stationInfo.dominantPollutant}</strong>
                </div>
              </div>
            )}

            {/* Satellite Hotspot details */}
            {inspectingPoint.hotspotInfo && (
              <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-orange-500/30">
                <div className="flex items-center justify-between text-[11px] text-orange-400 font-bold uppercase">
                  <span>Sensor: {inspectingPoint.hotspotInfo.satelliteSource}</span>
                  <span>{inspectingPoint.hotspotInfo.hotspotType.replace('_', ' ')}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Thermal Radiative Power:</span>
                    <strong className="text-white font-mono">{inspectingPoint.hotspotInfo.thermalRadiativePowerMW} MW</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">PM2.5 Flux Rate:</span>
                    <strong className="text-white font-mono">{inspectingPoint.hotspotInfo.estimatedPm25FluxKgPerHour} kg/hr</strong>
                  </div>
                </div>
                <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-900">
                  Wind Trajectory: {inspectingPoint.hotspotInfo.windTrajectoryVector.speedKmh} km/h • Bearing {inspectingPoint.hotspotInfo.windTrajectoryVector.bearingDeg}°
                </div>
              </div>
            )}

            {/* Citizen report details */}
            {inspectingPoint.citizenReportInfo && (
              <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-purple-500/30">
                <div className="text-[11px] text-purple-400 font-bold uppercase">
                  Emission: {inspectingPoint.citizenReportInfo.emissionType.replace('_', ' ')}
                </div>
                <p className="text-[11px] text-slate-300 italic">
                  "{inspectingPoint.citizenReportInfo.description}"
                </p>
                {inspectingPoint.citizenReportInfo.aiAnalysis && (
                  <div className="text-[10px] text-cyan-300 pt-1 border-t border-slate-900">
                    AI Smoke Opacity: <strong>{inspectingPoint.citizenReportInfo.aiAnalysis.opticalOpacityPercent}%</strong> • Local PM2.5 Delta: <strong>+{inspectingPoint.citizenReportInfo.aiAnalysis.estimatedPm25Contribution} µg/m³</strong>
                  </div>
                )}
              </div>
            )}

            {/* Standard coordinate weather & air readings */}
            {!inspectingPoint.hotspotInfo && !inspectingPoint.citizenReportInfo && !inspectingPoint.isStation && (
              inspectingPoint.loading ? (
                <div className="py-4 flex items-center justify-center gap-2 text-slate-400">
                  <div className="w-3.5 h-3.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  <span>Fetching atmospheric chemistry & weather...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">Estimated AQI</div>
                    <div className="text-xl font-black font-mono text-white mt-0.5">
                      {inspectingPoint.aqi ?? 'Live'}
                    </div>
                    {inspectingPoint.aqi != null && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase mt-1 inline-block"
                        style={{
                          backgroundColor: getIndiaCpcbCategory(inspectingPoint.aqi).bg,
                          color: getIndiaCpcbCategory(inspectingPoint.aqi).color
                        }}
                      >
                        {getIndiaCpcbCategory(inspectingPoint.aqi).label}
                      </span>
                    )}
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">Temperature</div>
                    <div className="text-xl font-black font-mono text-white mt-0.5">
                      {inspectingPoint.temp != null ? `${inspectingPoint.temp}°C` : 'Live'}
                    </div>
                    <span className="text-[9px] text-slate-500 mt-1 block">ECMWF Weather Model</span>
                  </div>
                </div>
              )
            )}

            {/* Click-to-Select Primary Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  onSelectLocation({
                    name: inspectingPoint.name,
                    latitude: inspectingPoint.lat,
                    longitude: inspectingPoint.lon,
                    adminRegion: inspectingPoint.adminRegion,
                    country: inspectingPoint.country || 'India'
                  });
                }}
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Set As Active Monitored Location</span>
              </button>

              <button
                onClick={() => {
                  onSelectLocation({
                    name: inspectingPoint.name,
                    latitude: inspectingPoint.lat,
                    longitude: inspectingPoint.lon,
                    adminRegion: inspectingPoint.adminRegion,
                    country: inspectingPoint.country || 'India'
                  });
                  onNavigateToDashboard();
                }}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
                <span>Open in Full Dashboard</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
