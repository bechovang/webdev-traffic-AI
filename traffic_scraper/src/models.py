"""Data models and schemas for traffic scraper."""

from dataclasses import dataclass
from typing import Dict


@dataclass
class RouteConfig:
    """Configuration for a single route to monitor."""

    id: str
    name: str
    origin: dict  # {"lat": float, "lng": float}
    destination: dict  # {"lat": float, "lng": float}
    distance_km: float
    description: str


@dataclass
class APIResponse:
    """TomTom API response data."""

    route_id: str
    distance_meters: int
    travel_time_seconds: int
    traffic_time_seconds: int
    raw_response: dict


@dataclass
class TrafficData:
    """Validated traffic data record."""

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
    congestion_level: str  # Very Low, Low, Moderate, High, Very High, Extreme
    los: str  # Level of Service (A-F)

    def to_dict(self) -> Dict[str, object]:
        """Convert to dictionary for CSV writing."""
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
        """Convert to CSV row string."""
        return ",".join(str(v) for v in self.to_dict().values())


class LOS_LEVELS:
    """Level of Service (LOS) classification thresholds.

    Based on congestion_ratio = current_speed / free_flow_speed.
    """

    A = {"min_ratio": 0.9, "description": "Thông thoáng"}
    B = {"min_ratio": 0.75, "description": "Khá thông thoáng"}
    C = {"min_ratio": 0.6, "description": "Bình thường"}
    D = {"min_ratio": 0.45, "description": "Bắt đầu chậm"}
    E = {"min_ratio": 0.3, "description": "Kẹt xe"}
    F = {"min_ratio": 0.0, "description": "Kẹt xe nặng"}


LOS_CONGESTION_MAP = {
    "A": "Very Low",
    "B": "Low",
    "C": "Moderate",
    "D": "High",
    "E": "Very High",
    "F": "Extreme",
}


def calculate_los(congestion_ratio: float) -> str:
    """Calculate Level of Service (LOS) from congestion ratio."""
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
    """Get congestion level description from LOS."""
    return LOS_CONGESTION_MAP.get(los, "Unknown")


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
