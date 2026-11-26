import React, { useState } from 'react';
import type { LiveTrafficMetric } from '../types';
import {
  MagnifyingGlass,
  Funnel,
  ArrowsDownUp,
  CaretRight,
} from '@phosphor-icons/react';
import { tokens } from '../tokens';

interface CorridorTableProps {
  metrics: LiveTrafficMetric[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
}

export const CorridorTable: React.FC<CorridorTableProps> = ({
  metrics,
  selectedRouteId,
  onSelectRoute,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [losFilter, setLosFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'speed' | 'ratio' | 'name'>('speed');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Filter & Search
  const filtered = metrics.filter((m) => {
    const matchName = m.route_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchLos = losFilter === 'ALL' || m.los === losFilter;
    return matchName && matchLos;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'speed') comparison = a.current_speed - b.current_speed;
    else if (sortField === 'ratio') comparison = a.congestion_ratio - b.congestion_ratio;
    else comparison = a.route_name.localeCompare(b.route_name);
    return sortAsc ? comparison : -comparison;
  });

  const handleSort = (field: 'speed' | 'ratio' | 'name') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Header & Controls */}
      <div className="flex flex-col gap-2.5 pb-2 border-b border-slate-200/60">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Chi tiết 10 Tuyến Trọng Điểm
          </h3>
          <span className="text-[11px] font-mono font-bold text-slate-500">
            {sorted.length}/{metrics.length} tuyến
          </span>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <MagnifyingGlass
              size={14}
              weight="bold"
              className="text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Tìm hành lang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-100/70 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
            />
          </div>

          {/* Filter dropdown */}
          <div className="flex items-center gap-1 bg-slate-100/70 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
            <Funnel size={13} weight="bold" className="text-slate-400" />
            <select
              value={losFilter}
              onChange={(e) => setLosFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả LOS</option>
              {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((lvl) => (
                <option key={lvl} value={lvl}>
                  LOS {lvl}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th
                onClick={() => handleSort('name')}
                className="pb-2 cursor-pointer hover:text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Hành lang</span>
                  <ArrowsDownUp size={12} weight="bold" />
                </div>
              </th>
              <th
                onClick={() => handleSort('speed')}
                className="pb-2 cursor-pointer hover:text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Tốc độ</span>
                  <ArrowsDownUp size={12} weight="bold" />
                </div>
              </th>
              <th className="pb-2">Thời gian</th>
              <th
                onClick={() => handleSort('ratio')}
                className="pb-2 cursor-pointer hover:text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>LOS</span>
                  <ArrowsDownUp size={12} weight="bold" />
                </div>
              </th>
              <th className="pb-2 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {sorted.map((m) => {
              const isSelected = selectedRouteId === m.route_id;
              const losColor = tokens.colors.los[m.los as keyof typeof tokens.colors.los] || tokens.colors.los.A;

              return (
                <tr
                  key={m.route_id}
                  onClick={() => onSelectRoute(m.route_id)}
                  className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50/60 font-semibold' : ''
                  }`}
                >
                  <td className="py-2.5 font-bold text-slate-800 flex items-center gap-2 max-w-[140px] truncate">
                    <span
                      className="w-2 h-2 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: losColor }}
                    />
                    <span className="truncate" title={m.route_name}>
                      {m.route_name}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono font-bold text-slate-800">
                    {m.current_speed} <span className="text-[10px] text-slate-400 font-normal">km/h</span>
                  </td>
                  <td className="py-2.5 font-mono text-slate-600">
                    {Math.round(m.travel_time_seconds / 60)} ph
                  </td>
                  <td className="py-2.5">
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black font-mono shadow-2xs"
                      style={{
                        backgroundColor: `${losColor}22`,
                        color: losColor,
                        border: `1px solid ${losColor}40`,
                      }}
                    >
                      {m.los}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <CaretRight
                      size={14}
                      weight="bold"
                      className={`ml-auto transition-colors ${
                        isSelected ? 'text-blue-600' : 'text-slate-300'
                      }`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
