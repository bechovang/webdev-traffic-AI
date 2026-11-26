"""Pytest configuration and fixtures for backend and scraper tests."""

import os
from unittest.mock import patch
import pytest

from backend.core.models import APIResponse, RouteConfig, TrafficData


@pytest.fixture
def mock_route_config():
    """Mock route configuration."""
    return RouteConfig(
        id="route_001",
        name="Test Route",
        origin={"lat": 10.862, "lng": 106.775},
        destination={"lat": 10.835, "lng": 106.782},
        distance_km=3.0,
        description="Test route for unit tests",
    )


@pytest.fixture
def mock_api_response():
    """Mock TomTom API response."""
    return APIResponse(
        route_id="route_001",
        distance_meters=3000,
        travel_time_seconds=300,
        traffic_time_seconds=480,
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
        congestion_level="Moderate",
        los="C",
    )


@pytest.fixture
def mock_env_vars(tmp_path):
    """Mock environment variables for testing."""
    with patch.dict(os.environ, {"TOMTOM_API_KEY": "test_api_key_12345"}):
        yield
