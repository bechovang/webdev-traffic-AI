import React from 'react';
import {
  SlidersHorizontal,
  Sun,
  SunHorizon,
  CloudRain,
  WarningOctagon,
  ArrowCounterClockwise,
  CheckCircle,
} from '@phosphor-icons/react';
import { tokens } from '../tokens';

interface SimulationControlsProps {
  currentScenario: string;
  onSelectScenario: (scenario: string) => void;
  isLoading: boolean;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  currentScenario,
  onSelectScenario,
  isLoading,
}) => {
  const scenarios = [
    {
      id: 'normal',
      name: 'Normal Flow',
      desc: 'Free flow, standard city velocity',
      icon: ArrowCounterClockwise,
      color: tokens.colors.los.A,
    },
    {
      id: 'morning_rush',
      name: 'Morning Peak',
      desc: '07:00 - 09:00: High volume inbound to city center',
      icon: Sun,
      color: tokens.colors.los.C,
    },
    {
      id: 'evening_rush',
      name: 'Evening Peak',
      desc: '17:00 - 19:30: Gateway corridors & Cat Lai port gridlock',
      icon: SunHorizon,
      color: tokens.colors.los.E,
    },
    {
      id: 'accident',
      name: 'Traffic Incident',
      desc: 'Accident blockage on Pham Van Dong & Vo Nguyen Giap',
      icon: WarningOctagon,
      color: tokens.colors.los.F,
    },
    {
      id: 'rain',
      name: 'Heavy Rain / Flood',
      desc: 'Citywide speed drops by 35-45% due to storms',
      icon: CloudRain,
      color: tokens.colors.brand.primary,
    },
  ];

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Header Info */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/60">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs"
          style={{
            backgroundColor: `${tokens.colors.brand.primary}15`,
            color: tokens.colors.brand.primary,
          }}
        >
          <SlidersHorizontal size={18} weight="duotone" />
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Simulation Scenarios (Demo Studio)
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Evaluate AI responsiveness & traffic degradation forecasting
          </p>
        </div>
      </div>

      {/* Scenarios List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isActive = currentScenario === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => onSelectScenario(sc.id)}
              disabled={isLoading}
              className={`w-full p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer flex items-start gap-3 relative ${
                isActive
                  ? 'border-blue-500 bg-blue-50/70 shadow-sm ring-1 ring-blue-500/20'
                  : 'border-slate-200/80 bg-white/60 hover:bg-white hover:border-slate-300'
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  backgroundColor: `${sc.color}18`,
                  color: sc.color,
                }}
              >
                <Icon size={18} weight={isActive ? 'fill' : 'bold'} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className={`text-xs font-bold ${isActive ? 'text-blue-900' : 'text-slate-800'}`}>
                    {sc.name}
                  </span>
                  {isActive && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-100/70 px-1.5 py-0.5 rounded-full">
                      <CheckCircle size={11} weight="fill" />
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  {sc.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info notice */}
      <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/60 text-[10px] text-slate-500 font-medium">
        Directly updates WebSocket telemetry stream and AI predictive models in real-time.
      </div>
    </div>
  );
};
