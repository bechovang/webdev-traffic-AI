import React, { useState } from 'react';
import {
  RoadHorizon,
  Sparkle,
  ChartLineUp,
  SlidersHorizontal,
  Table,
  CaretLeft,
  CaretRight,
  Info,
} from '@phosphor-icons/react';
import type { LiveTrafficMetric, RoutePrediction, SystemSummary } from '../types';
import { CorridorList } from './CorridorList';
import { AiPredictionPanel } from './AiPredictionPanel';
import { SpeedTrendChart } from './SpeedTrendChart';
import { SimulationControls } from './SimulationControls';
import { CorridorTable } from './CorridorTable';
import { tokens } from '../tokens';

interface FloatingHudProps {
  metrics: LiveTrafficMetric[];
  summary: SystemSummary | null;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  prediction: RoutePrediction | null;
  isLoadingPrediction: boolean;
  historyData: LiveTrafficMetric[];
  currentScenario: string;
  onSelectScenario: (scenario: string) => void;
  isScenarioLoading: boolean;
}

type TabType = 'corridors' | 'ai' | 'trend' | 'simulation' | 'table';

export const FloatingHud: React.FC<FloatingHudProps> = ({
  metrics,
  selectedRouteId,
  onSelectRoute,
  prediction,
  isLoadingPrediction,
  historyData,
  currentScenario,
  onSelectScenario,
  isScenarioLoading,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('corridors');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const selectedRouteObj = metrics.find((m) => m.route_id === selectedRouteId);

  const tabs = [
    {
      id: 'corridors' as TabType,
      label: 'Hành lang',
      shortLabel: 'Tuyến',
      icon: RoadHorizon,
      badge: metrics.length.toString(),
    },
    {
      id: 'ai' as TabType,
      label: 'Dự báo AI',
      shortLabel: 'AI',
      icon: Sparkle,
      badge: prediction?.predictions?.[0]?.risk_factor === 'high' ? 'Alert' : undefined,
      badgeColor: tokens.colors.los.F,
    },
    {
      id: 'trend' as TabType,
      label: 'Vận tốc',
      shortLabel: 'Biểu đồ',
      icon: ChartLineUp,
    },
    {
      id: 'simulation' as TabType,
      label: 'Kịch bản',
      shortLabel: 'Mô phỏng',
      icon: SlidersHorizontal,
    },
    {
      id: 'table' as TabType,
      label: 'Bảng số liệu',
      shortLabel: 'Bảng',
      icon: Table,
    },
  ];

  return (
    <aside
      className={`fixed top-20 left-4 bottom-5 z-20 flex transition-all duration-300 ease-out ${
        isCollapsed ? 'w-14' : 'w-[410px] max-w-[calc(100vw-2rem)]'
      }`}
      aria-label="GIS Control HUD"
    >
      <div className="w-full h-full flex flex-col bg-white/90 backdrop-blur-2xl border border-slate-200/90 rounded-2xl shadow-2xl shadow-slate-900/10 overflow-hidden">
        {/* Top Header Bar / Rail Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200/80 bg-slate-50/70">
          {!isCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="truncate">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block truncate">
                  {selectedRouteObj ? selectedRouteObj.route_name : 'TP. Thủ Đức'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block truncate">
                  {selectedRouteObj
                    ? `${selectedRouteObj.current_speed} km/h • LOS ${selectedRouteObj.los}`
                    : '10 Tuyến trọng điểm'}
                </span>
              </div>
            </div>
          )}

          {/* Collapse / Expand Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors ml-auto cursor-pointer"
            title={isCollapsed ? 'Mở rộng bảng điều khiển HUD' : 'Thu gọn HUD để xem bản đồ toàn cảnh'}
            aria-label="Toggle HUD"
          >
            {isCollapsed ? <CaretRight size={16} weight="bold" /> : <CaretLeft size={16} weight="bold" />}
          </button>
        </div>

        {/* Tab Navigation Segmented Bar */}
        <div className={`p-2 border-b border-slate-200/80 bg-white/50 ${isCollapsed ? 'flex flex-col gap-1 items-center' : 'grid grid-cols-5 gap-1'}`}>
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
                      className={`absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[9px] font-mono font-bold leading-none ${
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

        {/* Tab Content Area (Hidden if collapsed) */}
        {!isCollapsed && (
          <div className="flex-1 p-3.5 overflow-hidden flex flex-col bg-white/40">
            {activeTab === 'corridors' && (
              <CorridorList
                metrics={metrics}
                selectedRouteId={selectedRouteId}
                onSelectRoute={(id) => {
                  onSelectRoute(id);
                  // Optionally switch to AI preview or keep on corridors
                }}
              />
            )}

            {activeTab === 'ai' && (
              <AiPredictionPanel
                prediction={prediction}
                isLoading={isLoadingPrediction}
              />
            )}

            {activeTab === 'trend' && (
              <div className="flex flex-col h-full space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ChartLineUp size={16} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Xu hướng Vận tốc 30 Phút
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Biểu đồ giám sát suy giảm vận tốc theo thời gian
                    </p>
                  </div>
                </div>
                <div className="flex-1 min-h-[260px]">
                  <SpeedTrendChart
                    historyData={historyData}
                    selectedRouteName={selectedRouteObj?.route_name}
                  />
                </div>
                <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-200/60 text-[10px] text-blue-800 flex items-start gap-1.5">
                  <Info size={14} weight="fill" className="text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Dữ liệu được cập nhật tự động mỗi 15-30 giây qua WebSocket từ sensor và TomTom Traffic Flow.
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'simulation' && (
              <SimulationControls
                currentScenario={currentScenario}
                onSelectScenario={onSelectScenario}
                isLoading={isScenarioLoading}
              />
            )}

            {activeTab === 'table' && (
              <CorridorTable
                metrics={metrics}
                selectedRouteId={selectedRouteId}
                onSelectRoute={onSelectRoute}
              />
            )}
          </div>
        )}

        {/* Bottom Status Pill */}
        {!isCollapsed && (
          <div className="px-3 py-2 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              TomTom Live Stream &bull; AI Forecast
            </span>
            <span className="font-mono text-slate-400">HCM-THUDUC</span>
          </div>
        )}
      </div>
    </aside>
  );
};
