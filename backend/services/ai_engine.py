"""AI Traffic Forecasting Engine for Thu Duc key corridors.

Combines historical time-series trends with diurnal rush-hour decay patterns
and heuristic traffic wave propagation. Designed with plug-and-play architecture
ready for ML/GNN model weights when available.
"""

from datetime import datetime
from typing import Dict, List
from zoneinfo import ZoneInfo

from backend.models import LiveTrafficMetric, PredictionHorizon, RoutePrediction
from traffic_scraper.src.models import calculate_congestion_level, calculate_los

VIETNAM_TZ = ZoneInfo("Asia/Ho_Chi_Minh")


class AITrafficEngine:
    """Predicts traffic speed and congestion level for 15, 30, and 45 minutes ahead."""

    def __init__(self):
        # Peak rush-hour intervals in Thu Duc (Hour ranges in local time)
        self.morning_peak = (7.0, 9.0)  # 7:00 AM - 9:00 AM
        self.evening_peak = (16.5, 19.0)  # 4:30 PM - 7:00 PM

    def _get_rush_hour_factor(self, target_hour: float) -> float:
        """Returns speed degradation factor [0.55 - 1.0] based on time of day."""
        # Morning peak
        if self.morning_peak[0] <= target_hour <= self.morning_peak[1]:
            # Peak apex at 7:45 AM (7.75)
            distance_from_apex = abs(target_hour - 7.75)
            return max(0.55, 0.60 + distance_from_apex * 0.3)
        # Evening peak
        if self.evening_peak[0] <= target_hour <= self.evening_peak[1]:
            # Peak apex at 17:45 PM (17.75)
            distance_from_apex = abs(target_hour - 17.75)
            return max(0.50, 0.55 + distance_from_apex * 0.3)
        # Off-peak night or midday
        if target_hour >= 22.0 or target_hour <= 5.5:
            return 1.05  # Faster night flow
        return 0.95

    def predict_route(
        self,
        current_metric: LiveTrafficMetric,
        historical_metrics: List[LiveTrafficMetric],
    ) -> RoutePrediction:
        """Forecasts speeds and LOS for +15, +30, and +45 minutes."""
        now = datetime.now(VIETNAM_TZ)
        current_decimal_hour = now.hour + now.minute / 60.0

        current_speed = current_metric.current_speed
        free_flow = max(current_metric.free_flow_speed, 30.0)

        # Detect current short-term trend (velocity acceleration)
        trend_direction = "stable"
        delta_rate = 0.0
        if len(historical_metrics) >= 2:
            prev_speed = historical_metrics[-2].current_speed
            delta_rate = (current_speed - prev_speed) / max(prev_speed, 10.0)
            if delta_rate > 0.05:
                trend_direction = "improving"
            elif delta_rate < -0.05:
                trend_direction = "worsening"

        horizons = [15, 30, 45]
        predictions: List[PredictionHorizon] = []

        for minutes in horizons:
            future_hour = (current_decimal_hour + (minutes / 60.0)) % 24
            rush_factor = self._get_rush_hour_factor(future_hour)

            # Projected speed blending current speed, rush hour curve, and momentum
            momentum_damping = 0.85 ** (minutes / 15.0)
            trend_impact = current_speed * delta_rate * 0.4 * momentum_damping

            # Base target speed at that hour
            target_hour_speed = free_flow * rush_factor

            # Projected speed
            pred_speed = (current_speed * (1.0 - 0.25 * (minutes / 15.0))) + (target_hour_speed * 0.25 * (minutes / 15.0))
            pred_speed += trend_impact

            # Bound speed reasonably
            pred_speed = max(8.0, min(pred_speed, free_flow * 1.1))
            pred_speed = round(pred_speed, 1)

            # Calculate predicted LOS
            ratio = pred_speed / free_flow if free_flow > 0 else 1.0
            pred_los = calculate_los(ratio)
            pred_congestion = calculate_congestion_level(pred_los)

            # Projected travel time
            # Distance approximation from current metric
            distance_km = (current_metric.free_flow_speed * current_metric.travel_time_seconds) / 3600.0
            distance_km = max(distance_km, 1.5)
            pred_travel_time = int((distance_km / pred_speed) * 3600)

            # Confidence score drops slightly further into the future
            confidence = round(max(0.65, 0.94 - (minutes * 0.005)), 2)

            # Risk factor
            if pred_los in ["E", "F"]:
                risk = "high"
            elif pred_los in ["C", "D"]:
                risk = "medium"
            else:
                risk = "low"

            h_trend = "stable"
            if pred_speed > current_speed + 2.0:
                h_trend = "improving"
            elif pred_speed < current_speed - 2.0:
                h_trend = "worsening"

            predictions.append(
                PredictionHorizon(
                    horizon_minutes=minutes,
                    predicted_speed=pred_speed,
                    predicted_los=pred_los,
                    predicted_congestion_level=pred_congestion,
                    predicted_travel_time_seconds=pred_travel_time,
                    confidence_score=confidence,
                    trend=h_trend,
                    risk_factor=risk,
                )
            )

        # Generate actionable advice
        next_los = predictions[0].predicted_los
        if next_los in ["E", "F"]:
            rec = f"Ùn tắc nghiêm trọng dự báo trong 15-30p tới (vận tốc ~{predictions[0].predicted_speed} km/h). Đề xuất phân luồng hoặc chọn lộ trình thay thế."
        elif next_los in ["C", "D"]:
            rec = f"Mật độ phương tiện gia tăng vừa phải trong 30p tới. Lưu thông chậm nhưng duy trì ổn định."
        else:
            rec = "Tuyến đường thông thoáng, lưu thông thuận lợi trong 45 phút tiếp theo."

        return RoutePrediction(
            route_id=current_metric.route_id,
            route_name=current_metric.route_name,
            current_speed=current_speed,
            free_flow_speed=round(free_flow, 1),
            predictions=predictions,
            recommendation=rec,
        )


ai_engine = AITrafficEngine()
