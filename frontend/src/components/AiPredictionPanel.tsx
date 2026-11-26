import React, { useState } from 'react';
import type { RoutePrediction } from '../types';
import { getTrafficToken } from '../tokens';
import {
  Sparkle,
  TrendUp,
  TrendDown,
  Minus,
  Clock,
  ShieldCheck,
  Warning,
  LightbulbFilament,
  Speedometer,
} from '@phosphor-icons/react';

interface AiPredictionPanelProps {
  prediction: RoutePrediction | null;
  isLoading: boolean;
}

export const AiPredictionPanel: React.FC<AiPredictionPanelProps> = ({
  prediction,
  isLoading,
}) => {
  const [selectedHorizon, setSelectedHorizon] = useState<number>(15);

  if (isLoading) {
    return (
      <div className="p-6 h-full flex flex-col justify-center items-center text-center">
        <Sparkle size={32} weight="fill" className="text-blue-500 animate-spin mb-3" />
        <span className="text-xs font-bold text-slate-800">Đang chạy mô hình AI suy luận...</span>
        <span className="text-[11px] text-slate-400 mt-1">Phân tích chuỗi thời gian & sóng ùn tắc</span>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="p-6 h-full flex flex-col justify-center items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
          <Sparkle size={24} weight="bold" />
        </div>
        <h3 className="font-extrabold text-slate-800 text-sm">Chưa chọn tuyến đường</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
          Nhấp chọn một tuyến trên bản đồ để xem dự báo AI 15p - 30p - 45p tới.
        </p>
      </div>
    );
  }

  const currentPred =
    prediction.predictions.find((p) => p.horizon_minutes === selectedHorizon) ||
    prediction.predictions[0];

  const token = getTrafficToken(currentPred.predicted_los);

  return (
    <div className="flex flex-col h-full justify-between gap-3 p-1">
      <div>
        {/* Route Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              <Sparkle size={13} weight="fill" />
              <span>Dự báo AI Trực quan</span>
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">{prediction.route_name}</h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-medium">Hiện tại</span>
            <div className="text-xs font-black text-slate-800 flex items-center gap-1">
              <Speedometer size={13} weight="bold" className="text-blue-600" />
              <span>{prediction.current_speed} km/h</span>
            </div>
          </div>
        </div>

        {/* Horizon Tabs (+15p, +30p, +45p) */}
        <div className="flex items-center p-1 bg-slate-100/90 rounded-xl mt-3">
          {prediction.predictions.map((p) => {
            const isTabActive = selectedHorizon === p.horizon_minutes;
            return (
              <button
                key={p.horizon_minutes}
                onClick={() => setSelectedHorizon(p.horizon_minutes)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isTabActive
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                +{p.horizon_minutes} phút
              </button>
            );
          })}
        </div>

        {/* Prediction Main Box */}
        <div className="mt-3.5 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Vận tốc dự báo</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-slate-900">{currentPred.predicted_speed}</span>
                <span className="text-xs font-semibold text-slate-500">km/h</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-500 font-medium">Xếp hạng dịch vụ</span>
              <div className="mt-1">
                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-black text-white shadow-xs"
                  style={{ backgroundColor: token.hex }}
                >
                  LOS {currentPred.predicted_los} ({currentPred.predicted_congestion_level})
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-200/60 text-xs">
            <div className="flex items-center gap-2">
              <Clock size={16} weight="bold" className="text-slate-400" />
              <div>
                <div className="text-[10px] text-slate-500 font-medium">Thời gian dự kiến</div>
                <div className="font-extrabold text-slate-800">
                  {Math.round(currentPred.predicted_travel_time_seconds / 60)} phút
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentPred.trend === 'improving' ? (
                <TrendUp size={16} weight="bold" className="text-emerald-500" />
              ) : currentPred.trend === 'worsening' ? (
                <TrendDown size={16} weight="bold" className="text-rose-500" />
              ) : (
                <Minus size={16} weight="bold" className="text-slate-400" />
              )}
              <div>
                <div className="text-[10px] text-slate-500 font-medium">Xu hướng</div>
                <div className="font-extrabold text-slate-800">
                  {currentPred.trend === 'improving'
                    ? 'Cải thiện'
                    : currentPred.trend === 'worsening'
                    ? 'Ùn ứ tăng'
                    : 'Ổn định'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Confidence & Risk */}
        <div className="flex items-center justify-between mt-3 text-xs px-1">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <ShieldCheck size={14} weight="bold" className="text-blue-600" />
            <span>Độ tin cậy: <strong>{Math.round(currentPred.confidence_score * 100)}%</strong></span>
          </div>
          <div>
            {currentPred.risk_factor === 'high' ? (
              <span className="flex items-center gap-1 text-rose-600 font-bold">
                <Warning size={14} weight="bold" /> Nguy cơ tắc đường cao
              </span>
            ) : currentPred.risk_factor === 'medium' ? (
              <span className="flex items-center gap-1 text-amber-600 font-bold">
                <Warning size={14} weight="bold" /> Nguy cơ vừa phải
              </span>
            ) : (
              <span className="text-emerald-600 font-bold">Rủi ro thấp</span>
            )}
          </div>
        </div>
      </div>

      {/* Actionable Civic Recommendation */}
      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-start gap-2.5">
        <LightbulbFilament size={16} weight="fill" className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-950 font-medium leading-relaxed">
          {prediction.recommendation}
        </p>
      </div>
    </div>
  );
};
