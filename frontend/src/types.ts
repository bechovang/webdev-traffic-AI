export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteInfo {
  id: string;
  name: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  distance_km: number;
  description: string;
}

export interface LiveTrafficMetric {
  timestamp: string;
  route_id: string;
  route_name: string;
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  current_speed: number;
  free_flow_speed: number;
  travel_time_seconds: number;
  congestion_level: string;
  los: string;
  congestion_ratio: number;
}

export interface SystemSummary {
  timestamp: string;
  average_speed: number;
  average_congestion_ratio: number;
  congested_routes_count: number;
  total_routes_count: number;
  los_distribution: Record<string, number>;
  system_status: string;
}

export interface PredictionHorizon {
  horizon_minutes: number;
  predicted_speed: number;
  predicted_los: string;
  predicted_congestion_level: string;
  predicted_travel_time_seconds: number;
  confidence_score: number;
  trend: 'improving' | 'worsening' | 'stable';
  risk_factor: 'low' | 'medium' | 'high';
}

export interface RoutePrediction {
  route_id: string;
  route_name: string;
  current_speed: number;
  free_flow_speed: number;
  predictions: PredictionHorizon[];
  recommendation: string;
}
