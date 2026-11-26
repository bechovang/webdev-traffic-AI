"""TomTom API client with retry logic for traffic scraper."""

from typing import Dict

import requests
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from src.logger import get_logger
from src.models import APIResponse, calculate_congestion_level, calculate_los

logger = get_logger()


class TomTomAPIError(Exception):
    """Custom exception for TomTom API errors."""


class TrafficAPIClient:
    """TomTom Traffic API client with automatic retry logic."""

    def __init__(self, api_key: str):
        """Initialize API client."""
        self.api_key = api_key
        self.base_url = "https://api.tomtom.com/routing/1/calculateRoute"
        self.session = requests.Session()

    def close(self) -> None:
        """Close the underlying HTTP session."""
        self.session.close()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=4),
        retry=retry_if_exception_type((requests.exceptions.RequestException,)),
        reraise=True,
    )
    def fetch_route_data(
        self,
        route_id: str,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
    ) -> APIResponse:
        """Fetch traffic data for a single route from TomTom API."""
        origin = f"{origin_lat},{origin_lng}"
        destination = f"{dest_lat},{dest_lng}"
        url = f"{self.base_url}/{origin}:{destination}/json"
        params = {
            "key": self.api_key,
            "traffic": "true",
            "avoid": "ferries",
        }

        logger.debug(
            "Fetching traffic data",
            extra={
                "route_id": route_id,
                "origin": origin,
                "destination": destination,
            },
        )

        try:
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            routes = data.get("routes", [])
            if not routes:
                raise TomTomAPIError(f"No routes found in API response for {route_id}")

            summary = routes[0].get("summary", {})
            distance_meters = summary.get("lengthInMeters", 0)
            travel_time_seconds = summary.get("travelTimeInSeconds", 0)
            traffic_time_seconds = summary.get("trafficTimeInSeconds", travel_time_seconds)

            if not distance_meters or not travel_time_seconds:
                raise TomTomAPIError(f"Invalid API response for {route_id}")

            api_response = APIResponse(
                route_id=route_id,
                distance_meters=distance_meters,
                travel_time_seconds=travel_time_seconds,
                traffic_time_seconds=traffic_time_seconds,
                raw_response=data,
            )

            logger.info(
                "Successfully fetched traffic data",
                extra={
                    "route_id": route_id,
                    "distance_meters": distance_meters,
                    "travel_time_seconds": travel_time_seconds,
                    "traffic_time_seconds": traffic_time_seconds,
                },
            )
            return api_response

        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code if e.response is not None else response.status_code
            if status_code == 401:
                logger.error("Authentication failed: Invalid API key")
                raise TomTomAPIError("Invalid TomTom API key") from e
            if status_code == 403:
                logger.error("Forbidden: API key does not have access to this resource")
                raise TomTomAPIError("API key lacks required permissions") from e
            if status_code == 429:
                logger.warning(f"Rate limit exceeded for {route_id}")
                raise TomTomAPIError("API rate limit exceeded") from e
            logger.error(f"HTTP error: {status_code}")
            raise TomTomAPIError(f"HTTP error: {status_code}") from e

        except requests.exceptions.Timeout:
            logger.warning(f"Request timeout for {route_id}")
            raise

        except requests.exceptions.RequestException as e:
            logger.warning(f"Request failed for {route_id}: {str(e)}")
            raise

        except (KeyError, ValueError, TypeError) as e:
            logger.error(f"Failed to parse API response for {route_id}: {str(e)}")
            raise TomTomAPIError(f"Invalid API response format: {str(e)}") from e

    def calculate_traffic_metrics(
        self,
        api_response: APIResponse,
        route_name: str,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
    ) -> Dict:
        """Calculate speed, congestion ratio, and LOS metrics from an APIResponse."""
        if api_response.traffic_time_seconds <= 0 or api_response.travel_time_seconds <= 0:
            raise TomTomAPIError(
                f"Invalid travel/traffic duration for {api_response.route_id}"
            )

        current_speed = (api_response.distance_meters / api_response.traffic_time_seconds) * 3.6
        free_flow_speed = (api_response.distance_meters / api_response.travel_time_seconds) * 3.6

        congestion_ratio = current_speed / free_flow_speed if free_flow_speed > 0 else 0.0
        los = calculate_los(congestion_ratio)
        congestion_level = calculate_congestion_level(los)

        logger.debug(
            "Calculated traffic metrics",
            extra={
                "route_id": api_response.route_id,
                "current_speed": round(current_speed, 2),
                "free_flow_speed": round(free_flow_speed, 2),
                "congestion_ratio": round(congestion_ratio, 2),
                "los": los,
            },
        )

        return {
            "route_id": api_response.route_id,
            "route_name": route_name,
            "origin_lat": origin_lat,
            "origin_lng": origin_lng,
            "dest_lat": dest_lat,
            "dest_lng": dest_lng,
            "current_speed": round(current_speed, 2),
            "free_flow_speed": round(free_flow_speed, 2),
            "travel_time_seconds": api_response.traffic_time_seconds,
            "congestion_level": congestion_level,
            "los": los,
        }
