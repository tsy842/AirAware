import React from 'react';
import { Activity, Layers, Globe2, ShieldAlert, Sparkles } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'dashboard' | 'map' | 'corridors' | 'alerts' | 'ai' | 'profile' | 'about';
  setActiveTab: (tab: 'dashboard' | 'map' | 'corridors' | 'alerts' | 'ai' | 'profile' | 'about') => void;
  unreadAlertsCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  unreadAlertsCount
}) => {
  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Home',
      icon: Activity
    },
    {
      id: 'map' as const,
      label: 'GIS Map',
      icon: Layers
    },
    {
      id: 'corridors' as const,
      label: 'Corridors',
      icon: Globe2
    },
    {
      id: 'alerts' as const,
      label: 'Alerts',
      icon: ShieldAlert,
      badge: unreadAlertsCount
    },
    {
      id: 'ai' as const,
      label: 'AI Advisor',
      icon: Sparkles
    }
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/90 md:hidden transition-all shadow-2xl pb-[env(safe-area-inset-bottom,8px)]"
    >
      <div className="flex items-center justify-around px-2 py-1.5 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 py-1.5 px-1 flex flex-col items-center justify-center relative rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-teal-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Active subtle pill background */}
              {isActive && (
                <div className="absolute inset-0 bg-teal-500/10 rounded-xl -z-10" />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-teal-400' : ''}`} />
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center border border-slate-950 animate-pulse">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'text-teal-300 font-bold' : 'text-slate-400'}`}>
                {item.label}
              </span>

              {/* Active Bottom Indicator Dot */}
              {isActive && (
                <div className="w-1.5 h-1 bg-teal-400 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
