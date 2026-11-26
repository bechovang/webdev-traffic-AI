"""TomTom API client with exponential backoff retry logic."""

from typing import Dict

import requests
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from backend.core.logger import get_logger
from backend.core.models import APIResponse, calculate_congestion_level, calculate_los

logger = get_logger()


class TomTomAPIError(Exception):
    """Custom exception for TomTom API errors."""


class TrafficAPIClient:
    """TomTom Traffic API client with automatic retry logic."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.tomtom.com/routing/1/calculateRoute"
        self.session = requests.Session()

    def close(self) -> None:
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
        """Fetches traffic flow data for a corridor from TomTom API."""
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
            resp = e.response or locals().get("response")
            status_code = resp.status_code if resp is not None else 0
            if status_code == 401:
                logger.error("Authentication failed: Invalid API key")
                raise TomTomAPIError("Invalid TomTom API key") from e
            if status_code == 403:
                logger.error("Forbidden: API key lacks required permissions")
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
        """Calculates velocities, congestion ratio, and LOS from an APIResponse."""
        if api_response.traffic_time_seconds <= 0 or api_response.travel_time_seconds <= 0:
            raise TomTomAPIError(f"Invalid duration for route {api_response.route_id}")

        current_speed = (api_response.distance_meters / api_response.traffic_time_seconds) * 3.6
        free_flow_speed = (api_response.distance_meters / api_response.travel_time_seconds) * 3.6

        congestion_ratio = current_speed / free_flow_speed if free_flow_speed > 0 else 0.0
        los = calculate_los(congestion_ratio)
        congestion_level = calculate_congestion_level(los)

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

    def search_places(
        self,
        query: str,
        lat: float = 10.825,
        lon: float = 106.758,
        radius: int = 35000,
        limit: int = 6,
    ) -> list:
        """Searches places/POIs via TomTom Search API with bias to Thu Duc / HCM."""
        if not query or len(query.strip()) < 2:
            return []

        url = f"https://api.tomtom.com/search/2/search/{requests.utils.quote(query)}.json"
        params = {
            "key": self.api_key,
            "lat": lat,
            "lon": lon,
            "radius": radius,
            "countrySet": "VN",
            "limit": limit,
            "language": "vi-VN",
        }

        try:
            resp = self.session.get(url, params=params, timeout=8)
            resp.raise_for_status()
            results = resp.json().get("results", [])
            places = []
            for r in results:
                poi = r.get("poi", {})
                addr = r.get("address", {})
                name = poi.get("name") or addr.get("freeformAddress", "Địa điểm")
                address = addr.get("freeformAddress", name)
                pos = r.get("position", {})
                if "lat" in pos and "lon" in pos:
                    places.append({
                        "name": name,
                        "address": address,
                        "lat": pos["lat"],
                        "lng": pos["lon"],
                    })
            return places
        except Exception as e:
            logger.warning(f"TomTom search failed: {e}")
            return []

    def reverse_geocode(self, lat: float, lon: float) -> str:
        """Finds address for a coordinate point via TomTom Reverse Geocode API."""
        url = f"https://api.tomtom.com/search/2/reverseGeocode/{lat},{lon}.json"
        params = {"key": self.api_key, "language": "vi-VN"}
        try:
            resp = self.session.get(url, params=params, timeout=8)
            resp.raise_for_status()
            addrs = resp.json().get("addresses", [])
            if addrs:
                return addrs[0].get("address", {}).get("freeformAddress", f"Tọa độ ({lat:.4f}, {lon:.4f})")
        except Exception as e:
            logger.warning(f"TomTom reverse geocode failed: {e}")
        return f"Tọa độ ({lat:.4f}, {lon:.4f})"

    def plan_dynamic_route(
        self,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
    ) -> Dict:
        """Calculates dynamic turn-by-turn route and geometry between any 2 coordinates."""
        origin = f"{origin_lat},{origin_lng}"
        destination = f"{dest_lat},{dest_lng}"
        url = f"{self.base_url}/{origin}:{destination}/json"
        params = {
            "key": self.api_key,
            "traffic": "true",
            "routeType": "fastest",
            "avoid": "ferries",
        }

        try:
            resp = self.session.get(url, params=params, timeout=12)
            resp.raise_for_status()
            data = resp.json()
            routes = data.get("routes", [])
            if not routes:
                raise TomTomAPIError("Không tìm thấy đường đi giữa 2 điểm này")

            route = routes[0]
            summary = route.get("summary", {})
            distance_meters = summary.get("lengthInMeters", 1000)
            travel_time_seconds = summary.get("travelTimeInSeconds", 60)
            traffic_delay_seconds = summary.get("trafficDelayInSeconds", 0)

            free_flow_seconds = max(1, travel_time_seconds - traffic_delay_seconds)
            current_speed = (distance_meters / travel_time_seconds) * 3.6
            free_flow_speed = (distance_meters / free_flow_seconds) * 3.6

            congestion_ratio = current_speed / free_flow_speed if free_flow_speed > 0 else 1.0
            los = calculate_los(congestion_ratio)
            congestion_level = calculate_congestion_level(los)

            legs = route.get("legs", [])
            points = legs[0].get("points", []) if legs else []
            geometry = [[p["latitude"], p["longitude"]] for p in points]

            if not geometry:
                geometry = [[origin_lat, origin_lng], [dest_lat, dest_lng]]

            return {
                "distance_km": round(distance_meters / 1000, 2),
                "travel_time_seconds": travel_time_seconds,
                "travel_time_minutes": round(travel_time_seconds / 60, 1),
                "traffic_delay_minutes": round(traffic_delay_seconds / 60, 1),
                "current_speed": round(current_speed, 1),
                "free_flow_speed": round(free_flow_speed, 1),
                "congestion_level": congestion_level,
                "los": los,
                "geometry": geometry,
            }
        except Exception as e:
            logger.error(f"Dynamic routing failed: {e}")
            raise TomTomAPIError(f"Lỗi tính toán đường đi: {str(e)}") from e

