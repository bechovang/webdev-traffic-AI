import React, { useState } from 'react';
import type { RoutePrediction } from '../types';
import { Sparkles, TrendingUp, TrendingDown, Minus, Clock, ShieldCheck, AlertTriangle, Lightbulb } from 'lucide-react';
import { getLosColor } from './TrafficMap';

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
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs h-full flex flex-col justify-center items-center">
        <Sparkles className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <span className="text-sm font-semibold text-slate-700">Đang chạy mô hình suy luận AI...</span>
        <span className="text-xs text-slate-400 mt-1">Phân tích chuỗi thời gian & sóng ùn tắc</span>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs h-full flex flex-col justify-center items-center text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-800 text-sm">Chưa chọn tuyến đường</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
          Nhấp chọn một tuyến trên bản đồ hoặc bảng danh sách để xem dự báo AI 15p - 30p - 45p tới.
        </p>
      </div>
    );
  }

  const currentPred =
    prediction.predictions.find((p) => p.horizon_minutes === selectedHorizon) ||
    prediction.predictions[0];

  const losColor = getLosColor(currentPred.predicted_los);

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs h-full flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Dự báo AI Trực quan</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">{prediction.route_name}</h3>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 font-medium">Hiện tại</span>
            <div className="text-sm font-bold text-slate-800">{prediction.current_speed} km/h</div>
          </div>
        </div>

        {/* Horizon Tabs (+15p, +30p, +45p) */}
        <div className="flex items-center p-1 bg-slate-100/80 rounded-xl mt-3.5">
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
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/70">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium">Vận tốc dự báo</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-slate-900">{currentPred.predicted_speed}</span>
                <span className="text-xs font-semibold text-slate-500">km/h</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 font-medium">Xếp hạng dịch vụ</span>
              <div className="mt-0.5">
                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-2xs"
                  style={{ backgroundColor: losColor }}
                >
                  LOS {currentPred.predicted_los} ({currentPred.predicted_congestion_level})
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200/60 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-[11px] text-slate-500">Thời gian dự kiến</div>
                <div className="font-bold text-slate-800">
                  {Math.round(currentPred.predicted_travel_time_seconds / 60)} phút
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentPred.trend === 'improving' ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : currentPred.trend === 'worsening' ? (
                <TrendingDown className="w-4 h-4 text-rose-500" />
              ) : (
                <Minus className="w-4 h-4 text-slate-400" />
              )}
              <div>
                <div className="text-[11px] text-slate-500">Xu hướng</div>
                <div className="font-bold capitalize text-slate-800">
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

        {/* AI Confidence & Risk Tags */}
        <div className="flex items-center justify-between mt-3 text-xs px-1">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Độ tin cậy: <strong>{Math.round(currentPred.confidence_score * 100)}%</strong></span>
          </div>
          <div className="flex items-center gap-1 font-medium">
            {currentPred.risk_factor === 'high' ? (
              <span className="flex items-center gap-1 text-rose-600">
                <AlertTriangle className="w-3.5 h-3.5" /> Nguy cơ tắc đường cao
              </span>
            ) : currentPred.risk_factor === 'medium' ? (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="w-3.5 h-3.5" /> Nguy cơ vừa phải
              </span>
            ) : (
              <span className="text-emerald-600">Rủi ro thấp</span>
            )}
          </div>
        </div>
      </div>

      {/* Actionable Civic Tech Recommendation */}
      <div className="mt-4 p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-start gap-2.5">
        <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900 leading-relaxed font-medium">
          {prediction.recommendation}
        </p>
      </div>
    </div>
  );
};
