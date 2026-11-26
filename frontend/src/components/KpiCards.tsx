import React from 'react';
import {
  Speedometer,
  WarningOctagon,
  Pulse,
  ChartBar,
  ShieldCheck,
} from '@phosphor-icons/react';
import type { SystemSummary } from '../types';
import { tokens } from '../tokens';

interface KpiCardsProps {
  summary: SystemSummary | null;
  compact?: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ summary, compact = false }) => {
  if (!summary) {
    return (
      <div className="flex items-center gap-2 p-2 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-md animate-pulse">
        <div className="h-8 w-40 bg-slate-200/60 rounded-lg" />
        <div className="h-8 w-40 bg-slate-200/60 rounded-lg" />
      </div>
    );
  }

  const {
    average_speed,
    congested_routes_count,
    total_routes_count,
    los_distribution,
    system_status,
  } = summary;

  const isSevere = congested_routes_count >= 4;
  const isModerate = congested_routes_count >= 1;

  const statusBg = isSevere
    ? 'rgba(239, 68, 68, 0.12)'
    : isModerate
    ? 'rgba(245, 158, 11, 0.12)'
    : 'rgba(16, 185, 129, 0.12)';

  const statusColor = isSevere
    ? tokens.colors.los.F
    : isModerate
    ? tokens.colors.los.C
    : tokens.colors.los.A;

  if (compact) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white/85 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-900/5 text-xs">
        {/* Speed */}
        <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200">
          <Speedometer size={16} weight="duotone" className="text-blue-600" />
          <span className="font-semibold text-slate-500">Avg Speed:</span>
          <span className="font-extrabold text-slate-800 font-mono">
            {average_speed} <span className="text-[10px] font-normal text-slate-500">km/h</span>
          </span>
        </div>

        {/* Congestion count */}
        <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200">
          <WarningOctagon
            size={16}
            weight="duotone"
            style={{ color: isSevere ? tokens.colors.los.F : isModerate ? tokens.colors.los.C : tokens.colors.los.A }}
          />
          <span className="font-semibold text-slate-500">Congested:</span>
          <span
            className="font-extrabold font-mono"
            style={{ color: isSevere ? tokens.colors.los.F : isModerate ? tokens.colors.los.C : tokens.colors.los.A }}
          >
            {congested_routes_count}/{total_routes_count}
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200">
          <Pulse size={16} weight="duotone" style={{ color: statusColor }} />
          <span
            className="px-2 py-0.5 rounded-full font-bold text-[10px]"
            style={{ backgroundColor: statusBg, color: statusColor }}
          >
            {system_status}
          </span>
        </div>

        {/* LOS micro-bar */}
        <div className="hidden sm:flex items-center gap-1">
          <ChartBar size={14} weight="duotone" className="text-slate-400" />
          <div className="flex gap-0.5">
            {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((lvl) => {
              const count = los_distribution[lvl] || 0;
              return (
                <span
                  key={lvl}
                  title={`Level ${lvl}: ${count} routes`}
                  className="px-1 py-0.5 rounded text-[9px] font-bold font-mono"
                  style={{
                    backgroundColor: `${tokens.colors.los[lvl]}20`,
                    color: tokens.colors.los[lvl],
                  }}
                >
                  {lvl}:{count}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Citywide Average Speed */}
      <div className="bg-white/85 backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Citywide Avg Speed
          </span>
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Speedometer size={16} weight="duotone" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-slate-800 font-mono tracking-tight">
            {average_speed}
          </span>
          <span className="text-xs text-slate-500 font-medium">km/h</span>
        </div>
      </div>

      {/* Congested routes */}
      <div className="bg-white/85 backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Congested Corridors
          </span>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: statusBg, color: statusColor }}
          >
            <WarningOctagon size={16} weight="duotone" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-2xl font-black font-mono tracking-tight"
            style={{ color: statusColor }}
          >
            {congested_routes_count}
          </span>
          <span className="text-xs text-slate-500 font-medium">/ {total_routes_count} corridors</span>
        </div>
      </div>

      {/* System status */}
      <div className="bg-white/85 backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Traffic Condition
          </span>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: statusBg, color: statusColor }}
          >
            <Pulse size={16} weight="bold" />
          </div>
        </div>
        <div>
          <span
            className="inline-block px-2.5 py-0.5 text-xs font-bold rounded-full"
            style={{ backgroundColor: statusBg, color: statusColor }}
          >
            {system_status}
          </span>
        </div>
      </div>

      {/* LOS Distribution */}
      <div className="bg-white/85 backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            LOS Distribution (A-F)
          </span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={16} weight="duotone" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-1">
          {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((lvl) => {
            const count = los_distribution[lvl] || 0;
            return (
              <div key={lvl} className="flex-1 text-center" title={`Level ${lvl}: ${count} routes`}>
                <div
                  className="text-[10px] font-black py-0.5 rounded font-mono"
                  style={{
                    backgroundColor: `${tokens.colors.los[lvl]}25`,
                    color: tokens.colors.los[lvl],
                  }}
                >
                  {lvl}
                </div>
                <div className="text-[11px] font-bold text-slate-700 mt-0.5 font-mono">
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
