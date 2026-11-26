import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Circle,
  ArrowsDownUp,
  X,
  Crosshair,
  Sparkle,
  TrendUp,
  TrendDown,
  Minus,
  NavigationArrow,
  Clock,
  Speedometer,
  ShieldCheck,
  WarningOctagon,
  Buildings,
} from '@phosphor-icons/react';
import type { DynamicRoutePlanResult, PlaceSuggestion } from '../types';
import { searchPlaces, planDynamicRoute } from '../services/api';
import { getTrafficToken, tokens } from '../tokens';

interface RoutePlannerProps {
  onRouteCalculated: (result: DynamicRoutePlanResult | null) => void;
  isMapPicking: 'origin' | 'dest' | null;
  onSetMapPicking: (mode: 'origin' | 'dest' | null) => void;
  pickedPoint: { mode: 'origin' | 'dest'; place: PlaceSuggestion } | null;
}

// Popular locations in Thu Duc / Ho Chi Minh City for one-click route planning
const POPULAR_PRESETS: PlaceSuggestion[] = [
  {
    name: 'Chợ Thủ Đức',
    address: 'Võ Văn Ngân, Linh Tây, TP. Thủ Đức',
    lat: 10.8524,
    lng: 106.7578,
  },
  {
    name: 'Khu Công Nghệ Cao (SHTP)',
    address: 'Xa Lộ Hà Nội, Hiệp Phú, TP. Thủ Đức',
    lat: 10.8550,
    lng: 106.7900,
  },
  {
    name: 'Đại học Quốc Gia TP.HCM',
    address: 'Khu Đô thị ĐHQG, Linh Trung, TP. Thủ Đức',
    lat: 10.8750,
    lng: 106.8000,
  },
  {
    name: 'Cầu Sài Gòn (Bình Thạnh ➔ Thủ Đức)',
    address: 'Xa Lộ Hà Nội, An Phú, TP. Thủ Đức',
    lat: 10.7990,
    lng: 106.7230,
  },
  {
    name: 'Hầm Thủ Thiêm',
    address: 'Mai Chí Thọ, An Khánh, TP. Thủ Đức',
    lat: 10.7710,
    lng: 106.7070,
  },
  {
    name: 'Cảng Cát Lái',
    address: 'Đường Nguyễn Thị Định, Cát Lái, TP. Thủ Đức',
    lat: 10.7600,
    lng: 106.7850,
  },
  {
    name: 'Bến xe Miền Đông mới',
    address: 'Quốc Lộ 1A, Long Bình, TP. Thủ Đức',
    lat: 10.8780,
    lng: 106.8150,
  },
];

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  onRouteCalculated,
  isMapPicking,
  onSetMapPicking,
  pickedPoint,
}) => {
  // Input values
  const [originText, setOriginText] = useState('Chợ Thủ Đức');
  const [originPlace, setOriginPlace] = useState<PlaceSuggestion | null>(POPULAR_PRESETS[0]);

  const [destText, setDestText] = useState('Khu Công Nghệ Cao (SHTP)');
  const [destPlace, setDestPlace] = useState<PlaceSuggestion | null>(POPULAR_PRESETS[1]);

  // Autocomplete state
  const [activeField, setActiveField] = useState<'origin' | 'dest' | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Route calculation state
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState<DynamicRoutePlanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync picked points from map clicks
  useEffect(() => {
    if (pickedPoint) {
      if (pickedPoint.mode === 'origin') {
        setOriginText(pickedPoint.place.name);
        setOriginPlace(pickedPoint.place);
      } else {
        setDestText(pickedPoint.place.name);
        setDestPlace(pickedPoint.place);
      }
      onSetMapPicking(null);
    }
  }, [pickedPoint, onSetMapPicking]);

  // Search autocomplete debouncing
  const handleInputChange = (field: 'origin' | 'dest', value: string) => {
    if (field === 'origin') {
      setOriginText(value);
      setOriginPlace(null);
    } else {
      setDestText(value);
      setDestPlace(null);
    }

    setActiveField(field);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchPlaces(value);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  // Select a suggestion
  const handleSelectPlace = (field: 'origin' | 'dest', place: PlaceSuggestion) => {
    if (field === 'origin') {
      setOriginText(place.name);
      setOriginPlace(place);
    } else {
      setDestText(place.name);
      setDestPlace(place);
    }
    setActiveField(null);
    setSuggestions([]);
  };

  // Swap Origin and Destination
  const handleSwap = () => {
    const tempText = originText;
    const tempPlace = originPlace;

    setOriginText(destText);
    setOriginPlace(destPlace);

    setDestText(tempText);
    setDestPlace(tempPlace);
  };

  // Trigger Route Planning
  const handlePlanRoute = async () => {
    if (!originPlace || !destPlace) {
      setErrorMsg('Vui lòng chọn Điểm xuất phát và Điểm đến từ danh sách gợi ý hoặc bản đồ');
      return;
    }

    setIsCalculating(true);
    setErrorMsg(null);

    try {
      const result = await planDynamicRoute({
        origin_name: originPlace.name,
        origin_lat: originPlace.lat,
        origin_lng: originPlace.lng,
        dest_name: destPlace.name,
        dest_lat: destPlace.lat,
        dest_lng: destPlace.lng,
      });

      setRouteResult(result);
      onRouteCalculated(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi tìm đường';
      setErrorMsg(msg);
      setRouteResult(null);
      onRouteCalculated(null);
    } finally {
      setIsCalculating(false);
    }
  };

  // Auto-calculate on initial load if both presets exist
  useEffect(() => {
    if (originPlace && destPlace && !routeResult) {
      handlePlanRoute();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear route
  const handleClearRoute = () => {
    setRouteResult(null);
    onRouteCalculated(null);
    setErrorMsg(null);
  };

  const token = routeResult ? getTrafficToken(routeResult.los) : null;

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Route Input Box (Google Maps Style) */}
      <div className="bg-slate-50/90 rounded-2xl p-3 border border-slate-200/80 shadow-xs space-y-2 relative">
        {/* Origin Field */}
        <div className="flex items-center gap-2 relative">
          <div className="w-5 flex items-center justify-center shrink-0">
            <Circle size={12} weight="fill" className="text-emerald-500 ring-2 ring-emerald-200 rounded-full" />
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              value={originText}
              onChange={(e) => handleInputChange('origin', e.target.value)}
              onFocus={() => setActiveField('origin')}
              placeholder="Chọn điểm xuất phát..."
              className="w-full pl-3 pr-8 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {originText && (
              <button
                onClick={() => {
                  setOriginText('');
                  setOriginPlace(null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} weight="bold" />
              </button>
            )}
          </div>
        </div>

        {/* Swap Button Divider */}
        <div className="flex items-center justify-between px-2 pl-7">
          <div className="h-[1px] flex-1 bg-slate-200/80" />
          <button
            onClick={handleSwap}
            className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-200/80 transition-colors mx-2 cursor-pointer"
            title="Đổi chiều đi"
          >
            <ArrowsDownUp size={14} weight="bold" />
          </button>
          <div className="h-[1px] flex-1 bg-slate-200/80" />
        </div>

        {/* Destination Field */}
        <div className="flex items-center gap-2 relative">
          <div className="w-5 flex items-center justify-center shrink-0">
            <MapPin size={16} weight="fill" className="text-rose-600" />
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              value={destText}
              onChange={(e) => handleInputChange('dest', e.target.value)}
              onFocus={() => setActiveField('dest')}
              placeholder="Chọn điểm đến..."
              className="w-full pl-3 pr-8 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {destText && (
              <button
                onClick={() => {
                  setDestText('');
                  setDestPlace(null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} weight="bold" />
              </button>
            )}
          </div>
        </div>

        {/* Map Pick Shortcut Buttons */}
        <div className="flex items-center justify-between pt-1 text-[11px] font-medium text-slate-600">
          <button
            onClick={() => onSetMapPicking(isMapPicking === 'origin' ? null : 'origin')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer ${
              isMapPicking === 'origin'
                ? 'bg-emerald-600 text-white font-bold'
                : 'hover:bg-slate-200/70 text-slate-600'
            }`}
          >
            <Crosshair size={13} weight="bold" />
            <span>{isMapPicking === 'origin' ? 'Nhấp chọn Điểm đi' : 'Chọn Điểm đi trên bản đồ'}</span>
          </button>

          <button
            onClick={() => onSetMapPicking(isMapPicking === 'dest' ? null : 'dest')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer ${
              isMapPicking === 'dest'
                ? 'bg-rose-600 text-white font-bold'
                : 'hover:bg-slate-200/70 text-slate-600'
            }`}
          >
            <Crosshair size={13} weight="bold" />
            <span>{isMapPicking === 'dest' ? 'Nhấp chọn Điểm đến' : 'Chọn Điểm đến trên bản đồ'}</span>
          </button>
        </div>

        {/* Action Button: Find Route */}
        <button
          onClick={handlePlanRoute}
          disabled={isCalculating || !originPlace || !destPlace}
          className="w-full mt-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <NavigationArrow size={16} weight="fill" />
          <span>{isCalculating ? 'Đang phân tích đường đi & AI...' : 'Tìm Đường Đi Nhanh Nhất'}</span>
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {activeField && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-2 max-h-56 overflow-y-auto custom-scrollbar z-30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
            <span>{isSearching ? 'Đang tìm kiếm...' : 'Gợi ý địa điểm'}</span>
            <button onClick={() => setActiveField(null)} className="text-slate-400 hover:text-slate-700">
              <X size={12} weight="bold" />
            </button>
          </div>

          {suggestions.length > 0 ? (
            <div className="space-y-0.5">
              {suggestions.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPlace(activeField, p)}
                  className="w-full px-2.5 py-2 rounded-xl text-left hover:bg-slate-50 transition-colors flex items-start gap-2.5 cursor-pointer"
                >
                  <MapPin size={16} weight="duotone" className="text-blue-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-800 block truncate">{p.name}</span>
                    <span className="text-[10px] text-slate-500 font-medium block truncate">{p.address}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 px-2 font-semibold">Địa điểm phổ biến tại Thủ Đức:</span>
              {POPULAR_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPlace(activeField, p)}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Buildings size={14} weight="duotone" className="text-slate-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-700 block truncate">{p.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
          <WarningOctagon size={16} weight="fill" className="shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Route Plan Result Card (Google Maps ETA & Stats) */}
      {routeResult && (
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
          {/* Main ETA Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {Math.round(routeResult.travel_time_minutes)}
                  </span>
                  <span className="text-sm font-bold text-slate-700">phút</span>
                  <span className="text-xs text-slate-400 font-medium">&bull;</span>
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    {routeResult.distance_km} km
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: token?.hex }}
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    {routeResult.traffic_delay_minutes > 0
                      ? `Ùn ứ chậm thêm +${Math.round(routeResult.traffic_delay_minutes)} phút`
                      : 'Đường thông suốt, không kẹt xe'}
                  </span>
                </div>
              </div>

              {/* LOS Badge */}
              <span
                className="px-2.5 py-1 rounded-xl text-xs font-black font-mono shadow-2xs"
                style={{
                  backgroundColor: `${token?.hex}18`,
                  color: token?.hex,
                  border: `1px solid ${token?.hex}35`,
                }}
              >
                LOS {routeResult.los}
              </span>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 flex items-center gap-2">
                <Speedometer size={16} weight="duotone" className="text-blue-600" />
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Vận tốc thực tế</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {routeResult.current_speed} km/h
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 flex items-center gap-2">
                <Clock size={16} weight="duotone" className="text-indigo-600" />
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Tốc độ tự do</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {routeResult.free_flow_speed} km/h
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Traffic Prediction Section */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                style={{
                  background: `linear-gradient(135deg, ${tokens.colors.brand.primary}, ${tokens.colors.brand.accent})`,
                }}
              >
                <Sparkle size={15} weight="fill" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Dự báo AI Lộ Trình Này
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  Biến thiên lưu lượng sau 15, 30, 45 phút tới
                </p>
              </div>
            </div>

            {/* Prediction Horizons Grid */}
            <div className="grid grid-cols-3 gap-2">
              {routeResult.predictions.map((p) => {
                const pToken = getTrafficToken(p.predicted_los);
                return (
                  <div
                    key={p.horizon_minutes}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 flex flex-col justify-between space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">
                        +{p.horizon_minutes}p
                      </span>
                      {p.trend === 'improving' ? (
                        <TrendUp size={13} weight="bold" className="text-emerald-600" />
                      ) : p.trend === 'worsening' ? (
                        <TrendDown size={13} weight="bold" className="text-rose-600" />
                      ) : (
                        <Minus size={13} weight="bold" className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-slate-800 font-mono">
                        {p.predicted_speed}
                      </span>
                      <span className="text-[9px] text-slate-400">km/h</span>
                    </div>

                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono text-center block"
                      style={{
                        backgroundColor: pToken.bgSubtle,
                        color: pToken.text,
                      }}
                    >
                      LOS {p.predicted_los}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* AI Recommendation Box */}
            <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/70 text-xs text-blue-900 font-medium leading-relaxed">
              <span className="font-bold block mb-0.5 text-blue-950 flex items-center gap-1">
                <ShieldCheck size={14} weight="fill" className="text-blue-600" />
                Khuyến nghị thông minh từ AI:
              </span>
              {routeResult.recommendation}
            </div>
          </div>

          {/* Clear Route Button */}
          <button
            onClick={handleClearRoute}
            className="w-full py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Xóa lộ trình này
          </button>
        </div>
      )}
    </div>
  );
};
