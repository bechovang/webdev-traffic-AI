import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { LiveTrafficMetric } from '../types';
import { TrendingUp } from 'lucide-react';

interface SpeedTrendChartProps {
  historyData: LiveTrafficMetric[];
  selectedRouteName?: string;
}

export const SpeedTrendChart: React.FC<SpeedTrendChartProps> = ({
  historyData,
  selectedRouteName,
}) => {
  // Format data for Recharts
  const chartData = historyData.map((item, index) => {
    let timeLabel = `#${index + 1}`;
    try {
      const dt = new Date(item.timestamp);
      timeLabel = dt.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      // fallback
    }
    return {
      time: timeLabel,
      speed: item.current_speed,
      freeFlow: item.free_flow_speed,
      los: item.los,
    };
  });

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Diễn biến chuỗi thời gian</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-0.5">
            Biến thiên Vận tốc {selectedRouteName ? `— ${selectedRouteName}` : '(Toàn tuyến)'}
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-blue-600 inline-block" />
            <span>Vận tốc thực tế (km/h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-slate-300 inline-block" />
            <span>Tốc độ tự do (km/h)</span>
          </div>
        </div>
      </div>

      <div className="w-full h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <YAxis
              domain={[0, 60]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-md text-xs">
                      <div className="font-semibold text-slate-500 mb-1">{data.time}</div>
                      <div className="font-bold text-blue-600 text-sm">{data.speed} km/h</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Cấp độ LOS: {data.los}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="speed"
              stroke="#2563eb"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#speedGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
