import React, { useEffect, useState, useRef } from 'react';
import {
  NavigationArrow,
  Speedometer,
  WarningCircle,
  ShieldCheck,
  ArrowsClockwise,
  Clock,
  Sun,
  SunHorizon,
  CloudRain,
  WarningOctagon,
  ArrowCounterClockwise,
  CaretDown,
} from '@phosphor-icons/react';
import type { SystemSummary } from '../types';

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
  const [isScenarioDropdownOpen, setIsScenarioDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
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

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsScenarioDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scenarios = [
    {
      id: 'normal',
      label: 'Normal Flow',
      shortLabel: 'Normal',
      icon: ArrowCounterClockwise,
      dotColor: '#10b981',
    },
    {
      id: 'morning_rush',
      label: 'Morning Peak',
      shortLabel: 'AM Peak',
      icon: Sun,
      dotColor: '#f59e0b',
    },
    {
      id: 'evening_rush',
      label: 'Evening Peak',
      shortLabel: 'PM Peak',
      icon: SunHorizon,
      dotColor: '#f97316',
    },
    {
      id: 'accident',
      label: 'Incident',
      shortLabel: 'Incident',
      icon: WarningOctagon,
      dotColor: '#ef4444',
    },
    {
      id: 'rain',
      label: 'Heavy Rain',
      shortLabel: 'Rain',
      icon: CloudRain,
      dotColor: '#3b82f6',
    },
  ];

  const currentSc = scenarios.find((s) => s.id === currentScenario) || scenarios[0];
  const CurrentScIcon = currentSc.icon;

  const isCongested = summary ? summary.congested_routes_count > 0 : false;

  return (
    <header className="fixed top-3 left-3 right-3 sm:left-5 sm:right-5 z-30 pointer-events-auto">
      {/* Unified Command Island (Single cohesive high-end glass container) */}
      <div className="max-w-[1540px] mx-auto hud-glass rounded-2xl px-3 sm:px-4 py-2 flex items-center justify-between gap-3 sm:gap-4 transition-all duration-300">
        
        {/* Left Zone: Brand Identity & Precision Heartbeat */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Double-Bezel Logo Monogram */}
          <div className="p-0.5 rounded-xl bg-slate-900/[0.04] ring-1 ring-slate-900/[0.06] shadow-2xs">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-xs shadow-blue-500/30">
              <NavigationArrow size={16} weight="fill" className="rotate-45" />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[13px] tracking-tight text-slate-900 leading-none">
                HCM Traffic AI
              </span>
              <span className="text-[9px] font-mono font-extrabold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/50 leading-none">
                Thu Duc
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1 leading-none">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isWsConnected ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isWsConnected ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </span>
                <span>{isWsConnected ? 'Live 8s' : 'Connecting'}</span>
              </span>
              <span className="text-slate-300 text-xs">&bull;</span>
              <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-400">
                <Clock size={11} weight="bold" />
                <span>{timeStr}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Center Zone: Precision Telemetry HUD (Shown on tablet and desktop) */}
        {summary && (
          <div className="hidden md:flex items-center gap-4 lg:gap-5 px-3 py-1 rounded-xl bg-slate-100/50 border border-slate-200/40">
            {/* Speed Metric */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50/80 text-blue-600 flex items-center justify-center shadow-2xs">
                <Speedometer size={16} weight="duotone" />
              </div>
              <div className="flex flex-col leading-none">
                <div className="flex items-baseline gap-0.5">
                  <span className="font-mono font-black text-slate-900 text-[13px]">
                    {summary.average_speed}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">km/h</span>
                </div>
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                  Avg Speed
                </span>
              </div>
            </div>

            <div className="h-4 w-[1px] bg-slate-200/70" />

            {/* Congestion Count */}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-2xs ${
                  isCongested ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {isCongested ? (
                  <WarningCircle size={16} weight="duotone" />
                ) : (
                  <ShieldCheck size={16} weight="duotone" />
                )}
              </div>
              <div className="flex flex-col leading-none">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`font-mono font-black text-[13px] ${
                      isCongested ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  >
                    {summary.congested_routes_count}
                    <span className="text-slate-400 font-normal"> / {summary.total_routes_count}</span>
                  </span>
                </div>
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                  Congested
                </span>
              </div>
            </div>

            <div className="h-4 w-[1px] bg-slate-200/70 hidden lg:block" />

            {/* Flow Status Pill */}
            <div
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-2xs ${
                isCongested
                  ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full inline-block animate-pulse ${
                  isCongested ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
              />
              <span>{summary.system_status}</span>
            </div>
          </div>
        )}

        {/* Right Zone: Tactile Segmented Scenario Control & Sync CTA */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Desktop Full Segmented Track (>= 1200px) */}
          <div className="hidden xl:flex items-center p-0.5 rounded-xl bg-slate-100/90 border border-slate-200/60 shadow-inner">
            {scenarios.map((sc) => {
              const Icon = sc.icon;
              const isActive = currentScenario === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => onSelectScenario(sc.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[9px] text-xs transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 font-extrabold shadow-xs shadow-slate-900/10 border border-slate-200/60 ring-1 ring-black/5'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 font-medium'
                  }`}
                  title={sc.label}
                >
                  <Icon
                    size={14}
                    weight={isActive ? 'fill' : 'bold'}
                    style={{ color: isActive ? sc.dotColor : undefined }}
                  />
                  <span>{sc.shortLabel}</span>
                  {isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block ml-0.5"
                      style={{ backgroundColor: sc.dotColor }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Compact Dropdown Pill for Tablets / Smaller Desktops (< 1200px) */}
          <div className="xl:hidden relative" ref={dropdownRef}>
            <button
              onClick={() => setIsScenarioDropdownOpen(!isScenarioDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/70 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
            >
              <CurrentScIcon size={14} weight="fill" style={{ color: currentSc.dotColor }} />
              <span>{currentSc.shortLabel}</span>
              <CaretDown size={12} weight="bold" className="text-slate-400" />
            </button>

            {isScenarioDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-2xl rounded-2xl border border-slate-200 shadow-2xl p-1.5 z-50 space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                  Simulation Scenarios
                </div>
                {scenarios.map((sc) => {
                  const Icon = sc.icon;
                  const isActive = currentScenario === sc.id;
                  return (
                    <button
                      key={sc.id}
                      onClick={() => {
                        onSelectScenario(sc.id);
                        setIsScenarioDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-50 text-blue-900 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={14} weight={isActive ? 'fill' : 'bold'} style={{ color: sc.dotColor }} />
                        <span>{sc.label}</span>
                      </div>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc.dotColor }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Precision Sync Action Button */}
          <button
            onClick={onPollNow}
            disabled={isPolling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs shadow-sm shadow-slate-900/20 border border-slate-800 transition-all cursor-pointer disabled:opacity-50"
            title="Fetch latest traffic telemetry"
          >
            <ArrowsClockwise
              size={14}
              weight="bold"
              className={isPolling ? 'animate-spin text-blue-400' : 'text-slate-300'}
            />
            <span className="hidden sm:inline">{isPolling ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>

      </div>
    </header>
  );
};
