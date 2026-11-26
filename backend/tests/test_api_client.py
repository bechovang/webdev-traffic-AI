"""Unit tests for TomTom API client module."""

from unittest.mock import Mock, patch
import pytest
from requests.exceptions import HTTPError, RequestException, Timeout

from backend.core.api_client import TomTomAPIError, TrafficAPIClient
from backend.core.models import APIResponse


class TestTrafficAPIClient:
    """Test suite for TrafficAPIClient class."""

    @pytest.fixture
    def api_client(self):
        return TrafficAPIClient(api_key="test_api_key")

    @pytest.fixture
    def mock_successful_response(self):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.raise_for_status = Mock()
        mock_response.json.return_value = {
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
        return mock_response

    def test_init(self, api_client):
        assert api_client.api_key == "test_api_key"
        assert "tomtom.com" in api_client.base_url
        assert api_client.session is not None

    @patch("backend.core.api_client.requests.Session.get")
    def test_fetch_route_data_success(self, mock_get, api_client, mock_successful_response):
        mock_get.return_value = mock_successful_response

        response = api_client.fetch_route_data(
            route_id="route_001",
            origin_lat=10.862,
            origin_lng=106.775,
            dest_lat=10.835,
            dest_lng=106.782,
        )

        assert isinstance(response, APIResponse)
        assert response.route_id == "route_001"
        assert response.distance_meters == 3000
        assert response.travel_time_seconds == 300
        assert response.traffic_time_seconds == 480

    @patch("backend.core.api_client.requests.Session.get")
    def test_fetch_route_data_401_error(self, mock_get, api_client):
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.raise_for_status.side_effect = HTTPError(response=mock_response)
        mock_get.return_value = mock_response

        with pytest.raises(TomTomAPIError) as exc_info:
            api_client.fetch_route_data(
                route_id="route_001",
                origin_lat=10.862,
                origin_lng=106.775,
                dest_lat=10.835,
                dest_lng=106.782,
            )

        assert "Invalid TomTom API key" in str(exc_info.value)

    @patch("backend.core.api_client.requests.Session.get")
    def test_fetch_route_data_429_rate_limit(self, mock_get, api_client):
        mock_response = Mock()
        mock_response.status_code = 429
        mock_response.raise_for_status.side_effect = HTTPError(response=mock_response)
        mock_get.return_value = mock_response

        with pytest.raises(TomTomAPIError) as exc_info:
            api_client.fetch_route_data(
                route_id="route_001",
                origin_lat=10.862,
                origin_lng=106.775,
                dest_lat=10.835,
                dest_lng=106.782,
            )

        assert "rate limit" in str(exc_info.value).lower()

    @patch("backend.core.api_client.requests.Session.get")
    def test_fetch_route_data_timeout(self, mock_get, api_client):
        mock_get.side_effect = Timeout("Connection timeout")

        with pytest.raises(RequestException):
            api_client.fetch_route_data(
                route_id="route_001",
                origin_lat=10.862,
                origin_lng=106.775,
                dest_lat=10.835,
                dest_lng=106.782,
            )

    def test_calculate_traffic_metrics(self, api_client, mock_api_response):
        metrics = api_client.calculate_traffic_metrics(
            api_response=mock_api_response,
            route_name="Test Route",
            origin_lat=10.862,
            origin_lng=106.775,
            dest_lat=10.835,
            dest_lng=106.782,
        )

        assert metrics["route_id"] == "route_001"
        assert metrics["route_name"] == "Test Route"
        assert metrics["current_speed"] == 22.5
        assert metrics["free_flow_speed"] == 36.0
        assert metrics["travel_time_seconds"] == 480
        assert metrics["los"] == "C"
        assert metrics["congestion_level"] == "Moderate"

    def test_calculate_traffic_metrics_free_flow(self, api_client):
        free_flow_response = APIResponse(
            route_id="route_001",
            distance_meters=3000,
            travel_time_seconds=300,
            traffic_time_seconds=300,
            raw_response={},
        )

        metrics = api_client.calculate_traffic_metrics(
            api_response=free_flow_response,
            route_name="Test Route",
            origin_lat=10.862,
            origin_lng=106.775,
            dest_lat=10.835,
            dest_lng=106.782,
        )

        assert metrics["los"] == "A"
        assert metrics["congestion_level"] == "Very Low"

    def test_calculate_traffic_metrics_heavy_congestion(self, api_client):
        heavy_response = APIResponse(
            route_id="route_001",
            distance_meters=3000,
            travel_time_seconds=300,
            traffic_time_seconds=1200,
            raw_response={},
        )

        metrics = api_client.calculate_traffic_metrics(
            api_response=heavy_response,
            route_name="Test Route",
            origin_lat=10.862,
            origin_lng=106.775,
            dest_lat=10.835,
            dest_lng=106.782,
        )

        assert metrics["current_speed"] == 9.0
        assert metrics["los"] == "F"
        assert metrics["congestion_level"] == "Extreme"
