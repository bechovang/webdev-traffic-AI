"""Consolidated domain models, schemas, and LOS calculations."""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ==========================================
# Level of Service (LOS) Calculation
# ==========================================

class LOS_LEVELS:
    """Level of Service (LOS) classification thresholds based on congestion_ratio."""

    A = {"min_ratio": 0.9, "description": "Free Flow"}
    B = {"min_ratio": 0.75, "description": "Reasonably Free Flow"}
    C = {"min_ratio": 0.6, "description": "Stable Flow"}
    D = {"min_ratio": 0.45, "description": "Approaching Congestion"}
    E = {"min_ratio": 0.3, "description": "Congested"}
    F = {"min_ratio": 0.0, "description": "Severe Breakdown"}


LOS_CONGESTION_MAP = {
    "A": "Very Low",
    "B": "Low",
    "C": "Moderate",
    "D": "High",
    "E": "Very High",
    "F": "Extreme",
}


def calculate_los(congestion_ratio: float) -> str:
    """Calculates Level of Service (LOS A-F) from congestion ratio."""
    if congestion_ratio >= LOS_LEVELS.A["min_ratio"]:
        return "A"
    if congestion_ratio >= LOS_LEVELS.B["min_ratio"]:
        return "B"
    if congestion_ratio >= LOS_LEVELS.C["min_ratio"]:
        return "C"
    if congestion_ratio >= LOS_LEVELS.D["min_ratio"]:
        return "D"
    if congestion_ratio >= LOS_LEVELS.E["min_ratio"]:
        return "E"
    return "F"


def calculate_congestion_level(los: str) -> str:
    """Gets congestion level text description from LOS letter grade."""
    return LOS_CONGESTION_MAP.get(los, "Unknown")


# ==========================================
# Scraper Internal Data Models
# ==========================================

@dataclass
class RouteConfig:
    """Configuration for a single monitored corridor."""

    id: str
    name: str
    origin: dict  # {"lat": float, "lng": float}
    destination: dict  # {"lat": float, "lng": float}
    distance_km: float
    description: str


@dataclass
class APIResponse:
    """Raw TomTom Routing API response data."""

    route_id: str
    distance_meters: int
    travel_time_seconds: int
    traffic_time_seconds: int
    raw_response: dict


@dataclass
class TrafficData:
    """Validated traffic telemetry record for CSV storage."""

    timestamp: str  # ISO8601 with timezone
    route_id: str
    route_name: str
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float
    current_speed: float  # km/h
    free_flow_speed: float  # km/h
    travel_time_seconds: int
    congestion_level: str
    los: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "route_id": self.route_id,
            "route_name": self.route_name,
            "origin_lat": self.origin_lat,
            "origin_lng": self.origin_lng,
            "dest_lat": self.dest_lat,
            "dest_lng": self.dest_lng,
            "current_speed": self.current_speed,
            "free_flow_speed": self.free_flow_speed,
            "travel_time_seconds": self.travel_time_seconds,
            "congestion_level": self.congestion_level,
            "los": self.los,
        }

    def to_csv_row(self) -> str:
        return ",".join(str(v) for v in self.to_dict().values())


CSV_HEADERS = [
    "timestamp",
    "route_id",
    "route_name",
    "origin_lat",
    "origin_lng",
    "dest_lat",
    "dest_lng",
    "current_speed",
    "free_flow_speed",
    "travel_time_seconds",
    "congestion_level",
    "los",
]

FAILED_ROUTES_HEADERS = [
    "timestamp",
    "route_id",
    "route_name",
    "error_type",
    "error_message",
    "retry_attempts",
]


# ==========================================
# REST API & WebSocket Pydantic Schemas
# ==========================================

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


# ==========================================
# Dynamic Route Planning & Places Models
# ==========================================

class PlaceSuggestion(BaseModel):
    name: str
    address: str
    lat: float
    lng: float


class DynamicRoutePlanRequest(BaseModel):
    origin_name: str = "Origin"
    origin_lat: float
    origin_lng: float
    dest_name: str = "Destination"
    dest_lat: float
    dest_lng: float


class DynamicRoutePlanResult(BaseModel):
    origin: PlaceSuggestion
    destination: PlaceSuggestion
    distance_km: float
    travel_time_seconds: int
    travel_time_minutes: float
    traffic_delay_minutes: float
    current_speed: float
    free_flow_speed: float
    congestion_level: str
    los: str
    geometry: List[List[float]]  # [[lat, lng], [lat, lng], ...]
    predictions: List[PredictionHorizon]
    recommendation: str

