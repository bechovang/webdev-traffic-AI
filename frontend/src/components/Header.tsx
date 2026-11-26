import React, { useEffect, useState } from 'react';
import {
  NavigationArrow,
  Speedometer,
  WarningCircle,
  ArrowsClockwise,
  Broadcast,
  Clock,
  Sun,
  SunHorizon,
  CloudRain,
  WarningOctagon,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import type { SystemSummary } from '../types';
import { tokens } from '../tokens';

interface HeaderProps {
  summary: SystemSummary | null;
  isWsConnected: boolean;
  onPollNow: () => void;
  isPolling: boolean;
  currentScenario: string;
  onSelectScenario: (scenario: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  summary,
  isWsConnected,
  onPollNow,
  isPolling,
  currentScenario,
  onSelectScenario,
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
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const scenarios = [
    { id: 'normal', label: 'Normal', icon: ArrowCounterClockwise },
    { id: 'morning_rush', label: 'Morning Peak', icon: Sun },
    { id: 'evening_rush', label: 'Evening Peak', icon: SunHorizon },
    { id: 'accident', label: 'Incident / Collision', icon: WarningOctagon },
    { id: 'rain', label: 'Heavy Rain', icon: CloudRain },
  ];

  return (
    <header className="fixed top-4 left-4 right-4 z-30 pointer-events-none flex flex-col md:flex-row items-center justify-between gap-3">
      {/* Brand Card (Left) */}
      <div className="pointer-events-auto hud-glass px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-md">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/25"
          style={{ background: `linear-gradient(135deg, ${tokens.colors.brand.primary}, ${tokens.colors.brand.accent})` }}
        >
          <NavigationArrow size={20} weight="fill" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900 tracking-tight">
              HCM Traffic Intelligence
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                backgroundColor: tokens.colors.brand.primaryLight,
                color: tokens.colors.brand.primary,
                border: `1px solid ${tokens.colors.brand.primarySubtle}`,
              }}
            >
              Thu Duc City
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <Broadcast
                size={12}
                weight="bold"
                className={isWsConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}
              />
              <span>{isWsConnected ? 'Live Stream 8s' : 'Connecting...'}</span>
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <Clock size={12} weight="bold" />
              <span>{timeStr}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Center KPI Quick Capsule */}
      {summary && (
        <div className="pointer-events-auto hidden lg:flex items-center gap-4 hud-glass px-5 py-2 rounded-2xl shadow-md text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <Speedometer size={16} weight="bold" className="text-blue-600" />
            <span>Avg Speed:</span>
            <span className="font-extrabold text-slate-900 text-sm">
              {summary.average_speed} <span className="text-[10px] font-normal text-slate-500">km/h</span>
            </span>
          </div>
          <div className="h-4 w-[1px] bg-slate-200" />
          <div className="flex items-center gap-2">
            <WarningCircle
              size={16}
              weight="bold"
              className={summary.congested_routes_count > 0 ? 'text-rose-500' : 'text-emerald-500'}
            />
            <span>Congestion:</span>
            <span
              className={`font-extrabold text-sm ${
                summary.congested_routes_count > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {summary.congested_routes_count} / {summary.total_routes_count}
            </span>
          </div>
          <div className="h-4 w-[1px] bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-slate-900 font-bold">{summary.system_status}</span>
          </div>
        </div>
      )}

      {/* Right Controls: Scenario Switcher & Poll Now */}
      <div className="pointer-events-auto flex items-center gap-2.5">
        {/* Scenario Selector Dropdown Capsule */}
        <div className="hud-glass p-1 rounded-2xl shadow-md flex items-center gap-1">
          {scenarios.map((sc) => {
            const Icon = sc.icon;
            const isActive = currentScenario === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => onSelectScenario(sc.id)}
                title={sc.label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon size={14} weight={isActive ? 'bold' : 'regular'} />
                <span className="hidden xl:inline">{sc.label}</span>
              </button>
            );
          })}
        </div>

        {/* Poll Now Button */}
        <button
          onClick={onPollNow}
          disabled={isPolling}
          className="hud-glass-solid hover:bg-slate-50 text-slate-800 border border-slate-200/90 px-3.5 py-2.5 rounded-2xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          title="Fetch latest traffic telemetry"
        >
          <ArrowsClockwise
            size={16}
            weight="bold"
            className={`text-blue-600 ${isPolling ? 'animate-spin' : ''}`}
          />
          <span className="hidden sm:inline">{isPolling ? 'Polling...' : 'Poll Now'}</span>
        </button>
      </div>
    </header>
  );
};
