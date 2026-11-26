import React, { useEffect, useState } from 'react';
import { Activity, Clock, RefreshCw, Radio, Sparkles } from 'lucide-react';

interface HeaderProps {
  isWsConnected: boolean;
  onPollNow: () => void;
  isPolling: boolean;
  currentScenario: string;
}

export const Header: React.FC<HeaderProps> = ({
  isWsConnected,
  onPollNow,
  isPolling,
  currentScenario,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' (GMT+7)'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const scenarioLabels: Record<string, { label: string; color: string }> = {
    normal: { label: 'Bình thường', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    morning_rush: { label: 'Cao điểm Sáng (7h-9h)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    evening_rush: { label: 'Cao điểm Chiều (17h-19h)', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    accident: { label: 'Sự cố / Va chạm giao thông', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    rain: { label: 'Mưa to / Ngập nhẹ', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  };

  const activeScenario = scenarioLabels[currentScenario] || scenarioLabels.normal;

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 px-4 lg:px-8 py-3.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Title & Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg lg:text-xl font-bold tracking-tight text-slate-900">
                HCM Traffic AI Intelligence
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                TP. Thủ Đức
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Giám sát hành lang giao thông & Dự báo ùn tắc thời gian thực
            </p>
          </div>
        </div>

        {/* Right Info & Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Active Scenario Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${activeScenario.color}`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kịch bản: <strong>{activeScenario.label}</strong></span>
          </div>

          {/* Time Clock */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-100/80 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{timeStr}</span>
          </div>

          {/* WebSocket Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
            <Radio className={`w-3.5 h-3.5 ${isWsConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            <span>{isWsConnected ? 'Trực tiếp' : 'Đang kết nối...'}</span>
          </div>

          {/* Poll Now Button */}
          <button
            onClick={onPollNow}
            disabled={isPolling}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white rounded-lg text-xs font-semibold shadow-xs transition-all duration-150 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin' : ''}`} />
            <span>{isPolling ? 'Đang cập nhật...' : 'Cập nhật ngay'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
