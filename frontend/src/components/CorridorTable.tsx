import React, { useState } from 'react';
import type { LiveTrafficMetric } from '../types';
import { Search, Filter, ArrowUpDown, ChevronRight } from 'lucide-react';
import { getLosColor } from './TrafficMap';

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
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Chi tiết 10 Tuyến Đường Trọng Điểm</h3>
          <p className="text-xs text-slate-500 font-medium">Bảng theo dõi thời gian thực tốc độ và cấp độ dịch vụ</p>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm tên đường..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* LOS Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600">
            <Filter className="w-3 h-3 text-slate-400" />
            <select
              value={losFilter}
              onChange={(e) => setLosFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả LOS</option>
              <option value="A">LOS A</option>
              <option value="B">LOS B</option>
              <option value="C">LOS C</option>
              <option value="D">LOS D</option>
              <option value="E">LOS E</option>
              <option value="F">LOS F</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500 font-semibold">
              <th
                onClick={() => handleSort('name')}
                className="pb-2 cursor-pointer hover:text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Tuyến đường</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('speed')}
                className="pb-2 cursor-pointer hover:text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Vận tốc hiện tại</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="pb-2">Tốc độ tự do</th>
              <th className="pb-2">Thời gian đi</th>
              <th
                onClick={() => handleSort('ratio')}
                className="pb-2 cursor-pointer hover:text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Cấp độ LOS</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="pb-2 text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((m) => {
              const isSelected = selectedRouteId === m.route_id;
              const color = getLosColor(m.los);

              return (
                <tr
                  key={m.route_id}
                  onClick={() => onSelectRoute(m.route_id)}
                  className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <td className="py-2.5 font-bold text-slate-900 flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: color }}
                    />
                    <span>{m.route_name}</span>
                  </td>
                  <td className="py-2.5 font-bold text-slate-800">{m.current_speed} km/h</td>
                  <td className="py-2.5 text-slate-500 font-medium">{m.free_flow_speed} km/h</td>
                  <td className="py-2.5 font-medium text-slate-700">
                    {Math.round(m.travel_time_seconds / 60)} phút
                  </td>
                  <td className="py-2.5">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-2xs"
                      style={{ backgroundColor: color }}
                    >
                      {m.los} — {m.congestion_level}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <button className="text-slate-400 hover:text-blue-600 transition-colors">
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </button>
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
