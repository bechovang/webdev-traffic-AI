import React, { useState } from 'react';
import type { LiveTrafficMetric } from '../types';
import { getTrafficToken } from '../tokens';
import {
  MagnifyingGlass,
  Funnel,
  CaretRight,
  Speedometer,
} from '@phosphor-icons/react';

interface CorridorListProps {
  metrics: LiveTrafficMetric[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
}

export const CorridorList: React.FC<CorridorListProps> = ({
  metrics,
  selectedRouteId,
  onSelectRoute,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [losFilter, setLosFilter] = useState('ALL');

  const filtered = metrics.filter((m) => {
    const matchName = m.route_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchLos = losFilter === 'ALL' || m.los === losFilter;
    return matchName && matchLos;
  });

  return (
    <div className="flex flex-col h-full gap-3 p-1">
      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={14}
            weight="bold"
            className="text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
          />
          <input
            type="text"
            placeholder="Search corridor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
          <Funnel size={13} weight="bold" className="text-slate-400" />
          <select
            value={losFilter}
            onChange={(e) => setLosFilter(e.target.value)}
            className="bg-transparent border-none text-xs font-bold focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All</option>
            <option value="A">LOS A</option>
            <option value="B">LOS B</option>
            <option value="C">LOS C</option>
            <option value="D">LOS D</option>
            <option value="E">LOS E</option>
            <option value="F">LOS F</option>
          </select>
        </div>
      </div>

      {/* Corridor Cards List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-medium">
            No matching corridors found
          </div>
        ) : (
          filtered.map((m) => {
            const isSelected = selectedRouteId === m.route_id;
            const token = getTrafficToken(m.los);

            return (
              <div
                key={m.route_id}
                onClick={() => onSelectRoute(m.route_id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-400/80 shadow-xs ring-1 ring-blue-500/15'
                    : 'bg-white hover:bg-slate-50/90 border-slate-200/80 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: token.hex }}
                  />
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs text-slate-900 truncate">
                      {m.route_name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Speedometer size={12} weight="bold" className="text-blue-600" />
                        <strong className="text-slate-700">{m.current_speed}</strong> km/h
                      </span>
                      <span>&bull;</span>
                      <span>Free-flow {m.free_flow_speed} km/h</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-black text-white"
                    style={{ backgroundColor: token.hex }}
                  >
                    {m.los}
                  </span>
                  <CaretRight
                    size={13}
                    weight="bold"
                    className={isSelected ? 'text-blue-600' : 'text-slate-300'}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
