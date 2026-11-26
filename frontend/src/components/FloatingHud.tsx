import React, { useState } from 'react';
import {
  NavigationArrow,
  SlidersHorizontal,
  ChartLineUp,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import type {
  DynamicRoutePlanResult,
  LiveTrafficMetric,
  PlaceSuggestion,
  SystemSummary,
} from '../types';
import { RoutePlanner } from './RoutePlanner';
import { SimulationControls } from './SimulationControls';
import { SpeedTrendChart } from './SpeedTrendChart';
import { tokens } from '../tokens';

interface FloatingHudProps {
  metrics: LiveTrafficMetric[];
  summary: SystemSummary | null;
  historyData: LiveTrafficMetric[];
  currentScenario: string;
  onSelectScenario: (scenario: string) => void;
  isScenarioLoading: boolean;
  onRouteCalculated: (result: DynamicRoutePlanResult | null) => void;
  activeRoutePlan: DynamicRoutePlanResult | null;
  isMapPicking: 'origin' | 'dest' | null;
  onSetMapPicking: (mode: 'origin' | 'dest' | null) => void;
  pickedPoint: { mode: 'origin' | 'dest'; place: PlaceSuggestion } | null;
}

type TabType = 'navigation' | 'simulation' | 'trend';

export const FloatingHud: React.FC<FloatingHudProps> = ({
  summary,
  historyData,
  currentScenario,
  onSelectScenario,
  isScenarioLoading,
  onRouteCalculated,
  activeRoutePlan,
  isMapPicking,
  onSetMapPicking,
  pickedPoint,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('navigation');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const tabs = [
    {
      id: 'navigation' as TabType,
      label: 'Directions',
      shortLabel: 'Route',
      icon: NavigationArrow,
      badge: activeRoutePlan ? `${Math.round(activeRoutePlan.travel_time_minutes)}m` : undefined,
      badgeColor: tokens.colors.brand.primary,
    },
    {
      id: 'simulation' as TabType,
      label: 'Scenarios',
      shortLabel: 'Demo',
      icon: SlidersHorizontal,
    },
    {
      id: 'trend' as TabType,
      label: 'Velocity',
      shortLabel: 'Trend',
      icon: ChartLineUp,
    },
  ];

  return (
    <aside
      className={`fixed top-20 left-4 bottom-5 z-20 flex transition-all duration-300 ease-out ${
        isCollapsed ? 'w-14' : 'w-[430px] max-w-[calc(100vw-2rem)]'
      }`}
      aria-label="Google Maps Style Navigation HUD"
    >
      <div className="w-full h-full flex flex-col bg-white/92 backdrop-blur-2xl border border-slate-200/90 rounded-2xl shadow-2xl shadow-slate-900/10 overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200/80 bg-slate-50/80">
          {!isCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="truncate">
                <span className="text-xs font-bold text-slate-800 tracking-tight block truncate">
                  {activeRoutePlan
                    ? `${activeRoutePlan.origin.name} ➔ ${activeRoutePlan.destination.name}`
                    : 'Route Navigation & AI Forecast'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block truncate">
                  {activeRoutePlan
                    ? `${activeRoutePlan.distance_km} km • ${Math.round(activeRoutePlan.travel_time_minutes)} mins travel time`
                    : 'Real-time origin & destination routing'}
                </span>
              </div>
            </div>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors ml-auto cursor-pointer"
            title={isCollapsed ? 'Expand navigation panel' : 'Collapse panel'}
            aria-label="Toggle HUD"
          >
            {isCollapsed ? <CaretRight size={16} weight="bold" /> : <CaretLeft size={16} weight="bold" />}
          </button>
        </div>

        {/* Tab Switcher */}
        <div className={`p-2 border-b border-slate-200/80 bg-white/60 ${isCollapsed ? 'flex flex-col gap-1 items-center' : 'grid grid-cols-3 gap-1.5'}`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            if (isCollapsed) {
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsCollapsed(false);
                  }}
                  title={tab.label}
                  className={`relative p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon size={18} weight={isActive ? 'fill' : 'bold'} />
                  {tab.badge && (
                    <span
                      className="absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-white"
                      style={{ backgroundColor: tab.badgeColor || tokens.colors.brand.primary }}
                    />
                  )}
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-2 py-2 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100/90 font-medium hover:text-slate-900'
                }`}
              >
                <div className="relative">
                  <Icon size={16} weight={isActive ? 'fill' : 'bold'} />
                  {tab.badge && (
                    <span
                      className={`absolute -top-1.5 -right-3 px-1 py-0.2 rounded-full text-[9px] font-mono font-bold leading-none ${
                        isActive ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                      }`}
                      style={tab.badgeColor ? { backgroundColor: tab.badgeColor, color: '#fff' } : undefined}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] leading-none truncate max-w-full">
                  {tab.shortLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        {!isCollapsed && (
          <div className="flex-1 p-3.5 overflow-hidden flex flex-col bg-white/40">
            {activeTab === 'navigation' && (
              <RoutePlanner
                onRouteCalculated={onRouteCalculated}
                isMapPicking={isMapPicking}
                onSetMapPicking={onSetMapPicking}
                pickedPoint={pickedPoint}
              />
            )}

            {activeTab === 'simulation' && (
              <SimulationControls
                currentScenario={currentScenario}
                onSelectScenario={onSelectScenario}
                isLoading={isScenarioLoading}
              />
            )}

            {activeTab === 'trend' && (
              <div className="flex flex-col h-full space-y-3">
                <div className="pb-2 border-b border-slate-200/60">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Citywide Velocity Trend
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Live velocity fluctuations updated continuously via TomTom & WebSocket
                  </p>
                </div>
                <div className="flex-1 min-h-[260px]">
                  <SpeedTrendChart
                    historyData={historyData}
                    selectedRouteName={activeRoutePlan ? `${activeRoutePlan.origin.name} ➔ ${activeRoutePlan.destination.name}` : 'Thu Duc City Corridor'}
                  />
                </div>
                {summary && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex justify-between items-center font-medium">
                    <span>Avg Speed: <strong className="font-mono text-slate-900">{summary.average_speed} km/h</strong></span>
                    <span>Status: <strong className="text-blue-600">{summary.system_status}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom Status Pill */}
        {!isCollapsed && (
          <div className="px-3.5 py-2 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              TomTom Dynamic Routing &bull; AI Forecast
            </span>
            <span className="font-mono text-slate-400">HCM-LIVE</span>
          </div>
        )}
      </div>
    </aside>
  );
};
