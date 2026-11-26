"""Pydantic models for Traffic API and WebSocket communications."""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class Coordinates(BaseModel):
    lat: float
    lng: float


class RouteInfo(BaseModel):
    id: str
    name: str
    origin: Coordinates
    destination: Coordinates
    distance_km: float
    description: str


class LiveTrafficMetric(BaseModel):
    timestamp: str
    route_id: str
    route_name: str
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float
    current_speed: float
    free_flow_speed: float
    travel_time_seconds: int
    congestion_level: str
    los: str
    congestion_ratio: float


class SystemSummary(BaseModel):
    timestamp: str
    average_speed: float
    average_congestion_ratio: float
    congested_routes_count: int
    total_routes_count: int
    los_distribution: Dict[str, int]
    system_status: str


class PredictionHorizon(BaseModel):
    horizon_minutes: int
    predicted_speed: float
    predicted_los: str
    predicted_congestion_level: str
    predicted_travel_time_seconds: int
    confidence_score: float
    trend: str  # improving, worsening, stable
    risk_factor: str  # low, medium, high


class RoutePrediction(BaseModel):
    route_id: str
    route_name: str
    current_speed: float
    free_flow_speed: float
    predictions: List[PredictionHorizon]
    recommendation: str


class SimulationScenarioRequest(BaseModel):
    scenario: str = Field(..., description="normal, morning_rush, evening_rush, accident, rain")
    affected_routes: Optional[List[str]] = None
