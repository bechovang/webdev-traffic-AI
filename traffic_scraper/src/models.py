"""Data models and schemas for traffic scraper."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


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
    congestion_level: str  # A, B, C, D, E, F
    los: str  # Level of Service (A-F)

    def to_dict(self) -> dict:
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
        values = [
            self.timestamp,
            self.route_id,
            self.route_name,
            str(self.origin_lat),
            str(self.origin_lng),
            str(self.dest_lat),
            str(self.dest_lng),
            str(self.current_speed),
            str(self.free_flow_speed),
            str(self.travel_time_seconds),
            self.congestion_level,
            self.los,
        ]
        return ",".join(values)


class LOS_LEVELS:
    """Level of Service (LOS) classification thresholds.

    Based on congestion_ratio = current_speed / free_flow_speed
    """

    A = {"min_ratio": 0.9, "description": "Thông thoáng"}
    B = {"min_ratio": 0.75, "description": "Khá thông thoáng"}
    C = {"min_ratio": 0.6, "description": "Bình thường"}
    D = {"min_ratio": 0.45, "description": "Bắt đầu chậm"}
    E = {"min_ratio": 0.3, "description": "Kẹt xe"}
    F = {"min_ratio": 0.0, "description": "Kẹt xe nặng"}


def calculate_los(congestion_ratio: float) -> str:
    """Calculate Level of Service (LOS) from congestion ratio.

    Args:
        congestion_ratio: Ratio of current_speed to free_flow_speed

    Returns:
        LOS level (A-F)
    """
    if congestion_ratio >= LOS_LEVELS.A["min_ratio"]:
        return "A"
    elif congestion_ratio >= LOS_LEVELS.B["min_ratio"]:
        return "B"
    elif congestion_ratio >= LOS_LEVELS.C["min_ratio"]:
        return "C"
    elif congestion_ratio >= LOS_LEVELS.D["min_ratio"]:
        return "D"
    elif congestion_ratio >= LOS_LEVELS.E["min_ratio"]:
        return "E"
    else:
        return "F"


def calculate_congestion_level(los: str) -> str:
    """Get congestion level description from LOS.

    Args:
        los: Level of Service (A-F)

    Returns:
        Congestion level description
    """
    los_map = {
        "A": "Very Low",
        "B": "Low",
        "C": "Moderate",
        "D": "High",
        "E": "Very High",
        "F": "Extreme",
    }
    return los_map.get(los, "Unknown")


# CSV headers for output files
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

# CSV headers for failed routes
FAILED_ROUTES_HEADERS = [
    "timestamp",
    "route_id",
    "route_name",
    "error_type",
    "error_message",
    "retry_attempts",
]
