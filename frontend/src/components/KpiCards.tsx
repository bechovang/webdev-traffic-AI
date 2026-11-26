import React from 'react';
import { Gauge, ShieldAlert, Route, Zap, TrendingUp, AlertCircle } from 'lucide-react';
import type { SystemSummary } from '../types';

interface KpiCardsProps {
  summary: SystemSummary | null;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ summary }) => {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-slate-200/70 rounded-xl" />
        ))}
      </div>
    );
  }

  const { average_speed, congested_routes_count, total_routes_count, los_distribution, system_status } = summary;

  const isSevere = congested_routes_count >= 4;
  const isModerate = congested_routes_count >= 1;

  const statusColor = isSevere
    ? 'text-rose-700 bg-rose-50 border-rose-200'
    : isModerate
    ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-emerald-700 bg-emerald-50 border-emerald-200';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {/* Vận tốc trung bình */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500">Vận tốc TB Đô thị</span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Gauge className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{average_speed}</span>
          <span className="text-xs text-slate-500 font-medium">km/h</span>
        </div>
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 font-medium">
          <Zap className="w-3 h-3 text-amber-500" />
          <span>Tốc độ chuẩn tự do: 40 - 50 km/h</span>
        </div>
      </div>

      {/* Tuyến ùn tắc */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500">Tuyến đường Chậm / Kẹt</span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSevere ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${isSevere ? 'text-rose-600' : isModerate ? 'text-amber-600' : 'text-slate-900'}`}>
            {congested_routes_count}
          </span>
          <span className="text-xs text-slate-500 font-medium">/ {total_routes_count} tuyến</span>
        </div>
        <div className="mt-2 text-xs text-slate-500 font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-slate-400" />
          <span>Cấp độ LOS D, E, F</span>
        </div>
      </div>

      {/* Trạng thái hệ thống */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500">Tình trạng tổng thể</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-lg border ${statusColor}`}>
            {system_status}
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-500 font-medium">
          Dựa trên tỷ lệ vận tốc thực tế
        </div>
      </div>

      {/* Phân bổ mức LOS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500">Phân loại Dịch vụ (LOS)</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Route className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {['A', 'B', 'C', 'D', 'E', 'F'].map((los) => {
            const count = los_distribution[los] || 0;
            const bgClass =
              los === 'A' || los === 'B'
                ? 'bg-emerald-100 text-emerald-800'
                : los === 'C'
                ? 'bg-amber-100 text-amber-800'
                : los === 'D'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-rose-100 text-rose-800';
            return (
              <div key={los} className="flex-1 text-center" title={`LOS ${los}: ${count} tuyến`}>
                <div className={`text-[10px] font-bold py-0.5 rounded ${bgClass}`}>
                  {los}
                </div>
                <div className="text-[11px] font-semibold text-slate-700 mt-0.5">{count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
