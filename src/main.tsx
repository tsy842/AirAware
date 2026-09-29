import {createRoot} from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import App from './App.tsx';
import './index.css';

// Safety patch for Leaflet to prevent "Cannot read properties of undefined (reading '_leaflet_pos')"
// when elements are animated, detached, or cleaned up during React re-renders/unmounts
if (typeof window !== 'undefined' && L && L.DomUtil) {
  const originalGetPosition = L.DomUtil.getPosition;
  L.DomUtil.getPosition = function (el: any) {
    if (!el) return new L.Point(0, 0);
    try {
      return originalGetPosition.call(this, el) || new L.Point(0, 0);
    } catch {
      return new L.Point(0, 0);
    }
  };

  const originalSetPosition = L.DomUtil.setPosition;
  L.DomUtil.setPosition = function (el: any, point: any) {
    if (!el) return;
    try {
      originalSetPosition.call(this, el, point);
    } catch {
      // Safe no-op if element was detached or disposed
    }
  };
}

createRoot(document.getElementById('root')!).render(<App />);
