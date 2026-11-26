"""Central Traffic Service managing corridors metadata, telemetry, and simulation states."""

import csv
import glob
import random
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo
import yaml

from backend.config.settings import get_config
from backend.core.models import (
    Coordinates,
    LiveTrafficMetric,
    RouteInfo,
    SystemSummary,
    calculate_congestion_level,
    calculate_los,
)

VIETNAM_TZ = ZoneInfo("Asia/Ho_Chi_Minh")


class TrafficService:
    """Core service managing real-time and historical telemetry across all corridors."""

    def __init__(self):
        self.config = get_config()
        self.base_dir = self.config.base_dir
        self.routes_yaml_path = self.base_dir / "config" / "routes.yaml"
        self.data_dir = self.base_dir / self.config.data_dir

        self.routes_dict: Dict[str, RouteInfo] = {}
        self.live_telemetry: Dict[str, LiveTrafficMetric] = {}
        self.historical_buffer: Dict[str, List[LiveTrafficMetric]] = {}
        self.current_scenario: str = "normal"
        self.custom_affected_routes: List[str] = []

        self._load_routes()
        self._initialize_telemetry()

    def _load_routes(self) -> None:
        """Loads corridors from routes.yaml."""
        if not self.routes_yaml_path.exists():
            raise FileNotFoundError(f"Cannot find routes.yaml at {self.routes_yaml_path}")

        with open(self.routes_yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        for item in data.get("routes", []):
            route = RouteInfo(
                id=item["id"],
                name=item["name"],
                origin=Coordinates(lat=item["origin"]["lat"], lng=item["origin"]["lng"]),
                destination=Coordinates(lat=item["destination"]["lat"], lng=item["destination"]["lng"]),
                distance_km=float(item.get("distance_km", 2.5)),
                description=item.get("description", ""),
            )
            self.routes_dict[route.id] = route
            self.historical_buffer[route.id] = []

    def _initialize_telemetry(self) -> None:
        """Initializes telemetry from latest CSV if available, or generates snapshot."""
        loaded = self._load_latest_csv()
        if not loaded:
            self.generate_simulated_snapshot()

    def _load_latest_csv(self) -> bool:
        """Attempts to load newest scraped CSV file."""
        if not self.data_dir.exists():
            return False

        csv_files = sorted(glob.glob(str(self.data_dir / "traffic_data_*.csv")), reverse=True)
        if not csv_files:
            return False

        try:
            with open(csv_files[0], "r", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))

            if not rows:
                return False

            by_route: Dict[str, Dict[str, Any]] = {}
            for r in rows:
                by_route[r["route_id"]] = r

            now_iso = datetime.now(VIETNAM_TZ).isoformat()
            for route_id, r in by_route.items():
                if route_id in self.routes_dict:
                    cur_speed = float(r["current_speed"])
                    free_speed = float(r["free_flow_speed"])
                    ratio = cur_speed / free_speed if free_speed > 0 else 1.0
                    los = r.get("los", calculate_los(ratio))
                    metric = LiveTrafficMetric(
                        timestamp=r.get("timestamp", now_iso),
                        route_id=route_id,
                        route_name=r.get("route_name", self.routes_dict[route_id].name),
                        origin_lat=float(r["origin_lat"]),
                        origin_lng=float(r["origin_lng"]),
                        dest_lat=float(r["dest_lat"]),
                        dest_lng=float(r["dest_lng"]),
                        current_speed=cur_speed,
                        free_flow_speed=free_speed,
                        travel_time_seconds=int(r["travel_time_seconds"]),
                        congestion_level=r.get("congestion_level", calculate_congestion_level(los)),
                        los=los,
                        congestion_ratio=round(ratio, 2),
                    )
                    self.live_telemetry[route_id] = metric
                    self.historical_buffer[route_id].append(metric)
            return True
        except Exception:
            return False

    def get_routes(self) -> List[RouteInfo]:
        return list(self.routes_dict.values())

    def get_latest_metrics(self) -> List[LiveTrafficMetric]:
        return list(self.live_telemetry.values())

    def get_route_history(self, route_id: str, limit: int = 40) -> List[LiveTrafficMetric]:
        return self.historical_buffer.get(route_id, [])[-limit:]

    def get_system_summary(self) -> SystemSummary:
        metrics = list(self.live_telemetry.values())
        if not metrics:
            return SystemSummary(
                timestamp=datetime.now(VIETNAM_TZ).isoformat(),
                average_speed=40.0,
                average_congestion_ratio=0.85,
                congested_routes_count=0,
                total_routes_count=len(self.routes_dict),
                los_distribution={"A": len(self.routes_dict)},
                system_status="Normal",
            )

        avg_speed = sum(m.current_speed for m in metrics) / len(metrics)
        avg_ratio = sum(m.congestion_ratio for m in metrics) / len(metrics)
        congested_count = sum(1 for m in metrics if m.los in ["D", "E", "F"])

        los_dist: Dict[str, int] = {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0, "F": 0}
        for m in metrics:
            los_dist[m.los] = los_dist.get(m.los, 0) + 1

        if congested_count >= 5:
            status = "Widespread Congestion"
        elif congested_count >= 2:
            status = "Localized Congestion"
        else:
            status = "Optimal Flow"

        return SystemSummary(
            timestamp=datetime.now(VIETNAM_TZ).isoformat(),
            average_speed=round(avg_speed, 1),
            average_congestion_ratio=round(avg_ratio, 2),
            congested_routes_count=congested_count,
            total_routes_count=len(self.routes_dict),
            los_distribution=los_dist,
            system_status=status,
        )

    def set_scenario(self, scenario: str, affected_routes: Optional[List[str]] = None) -> None:
        self.current_scenario = scenario
        self.custom_affected_routes = affected_routes or []
        self.generate_simulated_snapshot()

    def generate_simulated_snapshot(self) -> List[LiveTrafficMetric]:
        now = datetime.now(VIETNAM_TZ)
        timestamp = now.isoformat()

        updated_metrics = []
        for route_id, route in self.routes_dict.items():
            free_flow = 50.0 if "Phạm Văn Đồng" in route.name or "Xa Lộ" in route.name else 40.0
            multiplier = 0.88 + random.uniform(-0.06, 0.06)

            if self.current_scenario == "morning_rush":
                if route_id in ["route_001", "route_002", "route_003", "route_007"]:
                    multiplier = random.uniform(0.32, 0.46)
                else:
                    multiplier = random.uniform(0.55, 0.70)
            elif self.current_scenario == "evening_rush":
                if route_id in ["route_002", "route_004", "route_006", "route_009"]:
                    multiplier = random.uniform(0.28, 0.42)
                else:
                    multiplier = random.uniform(0.50, 0.68)
            elif self.current_scenario == "accident":
                affected = self.custom_affected_routes or ["route_001", "route_009"]
                if route_id in affected:
                    multiplier = random.uniform(0.18, 0.28)
                else:
                    multiplier = random.uniform(0.80, 0.95)
            elif self.current_scenario == "rain":
                multiplier = random.uniform(0.45, 0.60)

            cur_speed = round(free_flow * multiplier, 1)
            ratio = cur_speed / free_flow
            los = calculate_los(ratio)
            congestion_level = calculate_congestion_level(los)

            distance_m = route.distance_km * 1000
            travel_time = int((distance_m / (cur_speed * 1000 / 3600)))

            metric = LiveTrafficMetric(
                timestamp=timestamp,
                route_id=route_id,
                route_name=route.name,
                origin_lat=route.origin.lat,
                origin_lng=route.origin.lng,
                dest_lat=route.destination.lat,
                dest_lng=route.destination.lng,
                current_speed=cur_speed,
                free_flow_speed=free_flow,
                travel_time_seconds=travel_time,
                congestion_level=congestion_level,
                los=los,
                congestion_ratio=round(ratio, 2),
            )
            self.live_telemetry[route_id] = metric
            self.historical_buffer[route_id].append(metric)
            if len(self.historical_buffer[route_id]) > 100:
                self.historical_buffer[route_id].pop(0)

            updated_metrics.append(metric)

        return updated_metrics


traffic_service = TrafficService()
