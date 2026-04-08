"""Pytest configuration and fixtures for traffic scraper tests."""

import os
import pytest
from unittest.mock import Mock, patch

from src.models import APIResponse, RouteConfig, TrafficData


@pytest.fixture
def mock_route_config():
    """Mock route configuration."""
    return RouteConfig(
        id="route_001",
        name="Test Route",
        origin={"lat": 10.862, "lng": 106.775},
        destination={"lat": 10.835, "lng": 106.782},
        distance_km=3,
        description="Test route for unit tests",
    )


@pytest.fixture
def mock_api_response():
    """Mock TomTom API response."""
    return APIResponse(
        route_id="route_001",
        distance_meters=3000,
        travel_time_seconds=300,  # 5 minutes at free flow
        traffic_time_seconds=480,  # 8 minutes with traffic
        raw_response={},
    )


@pytest.fixture
def mock_traffic_data():
    """Mock validated traffic data."""
    return TrafficData(
        timestamp="2026-04-09T10:15:00+07:00",
        route_id="route_001",
        route_name="Test Route",
        origin_lat=10.862,
        origin_lng=106.775,
        dest_lat=10.835,
        dest_lng=106.782,
        current_speed=22.5,
        free_flow_speed=36.0,
        travel_time_seconds=480,
        congestion_level="High",
        los="D",
    )


@pytest.fixture
def mock_tomtom_api_response():
    """Mock TomTom API JSON response."""
    return {
        "routes": [
            {
                "summary": {
                    "lengthInMeters": 3000,
                    "travelTimeInSeconds": 300,
                    "trafficTimeInSeconds": 480,
                }
            }
        ]
    }


@pytest.fixture
def mock_env_vars(tmp_path):
    """Mock environment variables for testing."""
    env_file = tmp_path / ".env"
    env_file.write_text(
        """
TOMTOM_API_KEY=test_api_key_12345
LOG_LEVEL=DEBUG
DATA_DIR=data/scraped_data
LOGS_DIR=logs
COLLECTION_DAYS=7
POLLING_INTERVAL_MINUTES=15
"""
    )

    with patch.dict(os.environ, {"TOMTOM_API_KEY": "test_api_key_12345"}):
        yield


@pytest.fixture
def mock_routes_yaml(tmp_path):
    """Mock routes.yaml configuration for testing."""
    routes_file = tmp_path / "routes.yaml"
    routes_file.write_text(
        """
routes:
  - id: route_001
    name: "Test Route 1"
    origin:
      lat: 10.862
      lng: 106.775
    destination:
      lat: 10.835
      lng: 106.782
    distance_km: 3
    description: "Test route"

  - id: route_002
    name: "Test Route 2"
    origin:
      lat: 10.825
      lng: 106.782
    destination:
      lat: 10.795
      lng: 106.785
    distance_km: 3.5
    description: "Another test route"

scraper:
  interval_minutes: 15
  collection_days: 7
  api_provider: "tomtom"

storage:
  data_dir: "data/scraped_data"
  reports_dir: "data/reports"
  failed_routes_file: "data/failed_routes.csv"

logging:
  level: "INFO"
  format: "json"
  rotation: "daily"
  retention_days: 7
"""
    )
    return routes_file
