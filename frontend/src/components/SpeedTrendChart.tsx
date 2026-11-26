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
import { ChartLineUp } from '@phosphor-icons/react';
import { tokens } from '../tokens';

interface SpeedTrendChartProps {
  historyData: LiveTrafficMetric[];
  selectedRouteName?: string;
}

export const SpeedTrendChart: React.FC<SpeedTrendChartProps> = ({
  historyData,
  selectedRouteName,
}) => {
  const chartData = historyData.map((item, index) => {
    let timeLabel = `#${index + 1}`;
    try {
      const dt = new Date(item.timestamp);
      timeLabel = dt.toLocaleTimeString('en-US', {
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
    <div className="flex flex-col h-full justify-between gap-3 p-1">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              <ChartLineUp size={13} weight="bold" />
              <span>Velocity Dynamics</span>
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 mt-0.5 truncate max-w-[240px]">
              {selectedRouteName || 'Full Corridor'}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-1.5 rounded-full bg-blue-600 inline-block" /> Actual
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-1.5 rounded-full bg-slate-300 inline-block" /> Free-flow
            </span>
          </div>
        </div>

        <div className="w-full h-48 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="hudSpeedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={tokens.colors.brand.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={tokens.colors.brand.primary} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <YAxis
                domain={[0, 60]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-md text-xs">
                        <div className="font-semibold text-slate-400 mb-0.5">{data.time}</div>
                        <div className="font-extrabold text-blue-600 text-sm">{data.speed} km/h</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-bold">
                          LOS Level: {data.los}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="speed"
                stroke={tokens.colors.brand.primary}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#hudSpeedGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs text-slate-500 font-medium flex items-center justify-between">
        <span>Latest Recorded Speed:</span>
        <strong className="text-slate-900 font-extrabold">
          {historyData[historyData.length - 1]?.current_speed ?? '--'} km/h
        </strong>
      </div>
    </div>
  );
};
