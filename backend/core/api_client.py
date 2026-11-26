"""TomTom API client with exponential backoff retry logic."""

import math
import re
import unicodedata
from typing import Dict, List, Optional

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


def _normalize_text(text: str) -> str:
    """Strips accents and diacritics for robust Vietnamese/English fuzzy search."""
    nfkd_form = unicodedata.normalize("NFD", text)
    clean = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    return clean.lower().replace("đ", "d").replace("Đ", "d").strip()


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two coordinate points in kilometers."""
    r = 6371.0  # Earth's mean radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


CURATED_LANDMARKS: List[Dict] = [
    {
        "name": "Thu Duc Central Market",
        "alias": ["cho thu duc", "thu duc market", "vo van ngan"],
        "address": "Vo Van Ngan St, Linh Tay, Thu Duc City",
        "lat": 10.8505,
        "lng": 106.7580,
        "category": "shopping",
    },
    {
        "name": "Saigon Hi-Tech Park (SHTP)",
        "alias": ["khu cong nghe cao", "shtp", "saigon hi-tech", "intel", "samsung"],
        "address": "Xa Lo Ha Noi, Tan Phu, Thu Duc City",
        "lat": 10.8550,
        "lng": 106.7850,
        "category": "tech",
    },
    {
        "name": "Vietnam National University HCM (VNU)",
        "alias": ["lang dai hoc", "vnu", "dhqg", "ktx khu a", "ktx khu b"],
        "address": "Linh Trung Ward, Thu Duc City",
        "lat": 10.8700,
        "lng": 106.8030,
        "category": "education",
    },
    {
        "name": "HCM City University of Technology and Education (HCMUTE)",
        "alias": ["su pham ky thuat", "spkt", "hcmute", "nga tu thu duc"],
        "address": "1 Vo Van Ngan, Linh Chieu, Thu Duc City",
        "lat": 10.8512,
        "lng": 106.7720,
        "category": "education",
    },
    {
        "name": "University of Information Technology (UIT)",
        "alias": ["cong nghe thong tin", "uit", "vnu uit"],
        "address": "VNU Campus, Linh Trung, Thu Duc City",
        "lat": 10.8702,
        "lng": 106.8033,
        "category": "education",
    },
    {
        "name": "GigaMall Pham Van Dong",
        "alias": ["gigamall", "giga mall", "pham van dong mall", "cgv gigamall"],
        "address": "240-242 Pham Van Dong, Hiep Binh Chanh, Thu Duc City",
        "lat": 10.8275,
        "lng": 106.7210,
        "category": "shopping",
    },
    {
        "name": "Vincom Mega Mall Thao Dien",
        "alias": ["vincom thao dien", "vincom mega mall", "thao dien"],
        "address": "161 Vo Nguyen Giap, Thao Dien, Thu Duc City",
        "lat": 10.8015,
        "lng": 106.7410,
        "category": "shopping",
    },
    {
        "name": "Vincom Plaza Le Van Viet",
        "alias": ["vincom le van viet", "le van viet mall"],
        "address": "50 Le Van Viet, Hiep Phu, Thu Duc City",
        "lat": 10.8468,
        "lng": 106.7765,
        "category": "shopping",
    },
    {
        "name": "Suoi Tien Theme Park",
        "alias": ["suoi tien", "khu du lich suoi tien", "cong vien suoi tien"],
        "address": "120 Ha Noi Highway, Tan Phu, Thu Duc City",
        "lat": 10.8660,
        "lng": 106.8030,
        "category": "park",
    },
    {
        "name": "New Mien Dong Bus Terminal",
        "alias": ["ben xe mien dong moi", "new mien dong", "bx mien dong", "ben xe"],
        "address": "National Highway 1A, Long Binh, Thu Duc City",
        "lat": 10.8780,
        "lng": 106.8150,
        "category": "transit",
    },
    {
        "name": "Cat Lai Port Logistics Hub",
        "alias": ["cang cat lai", "cat lai port", "nguyen thi dinh"],
        "address": "Nguyen Thi Dinh St, Cat Lai, Thu Duc City",
        "lat": 10.7600,
        "lng": 106.7850,
        "category": "tech",
    },
    {
        "name": "Thu Duc City Hospital",
        "alias": ["benh vien thu duc", "bv thu duc", "phu chau"],
        "address": "29 Phu Chau, Tam Phu, Thu Duc City",
        "lat": 10.8610,
        "lng": 106.7480,
        "category": "hospital",
    },
    {
        "name": "Thu Duc Regional General Hospital",
        "alias": ["benh vien da khoa khu vuc thu duc", "bv da khoa thu duc", "le van chi"],
        "address": "64 Le Van Chi, Linh Trung, Thu Duc City",
        "lat": 10.8625,
        "lng": 106.7680,
        "category": "hospital",
    },
    {
        "name": "Ho Chi Minh City Oncology Hospital (Branch 2)",
        "alias": ["benh vien ung buou co so 2", "ung buou cs2", "bv ung buou"],
        "address": "Road 400, Tan Phu, Thu Duc City",
        "lat": 10.8740,
        "lng": 106.8180,
        "category": "hospital",
    },
    {
        "name": "Binh Trieu Bridge Interchange",
        "alias": ["cau binh trieu", "binh trieu", "quoc lo 13"],
        "address": "National Highway 13, Hiep Binh Chanh, Thu Duc City",
        "lat": 10.8220,
        "lng": 106.7110,
        "category": "transit",
    },
    {
        "name": "Pham Van Dong & Kha Van Can Intersection",
        "alias": ["nga tu kha van can", "kha van can", "linh dong"],
        "address": "Pham Van Dong Corridor, Linh Dong, Thu Duc City",
        "lat": 10.8350,
        "lng": 106.7420,
        "category": "transit",
    },
    {
        "name": "Ben Thanh - Suoi Tien Metro Depot",
        "alias": ["metro depot", "ga metro", "ben thanh suoi tien depot"],
        "address": "Long Binh, Thu Duc City",
        "lat": 10.8810,
        "lng": 106.8220,
        "category": "transit",
    },
    {
        "name": "Linh Trung 1 Export Processing Zone",
        "alias": ["kcx linh trung", "linh trung 1", "khu che xuat"],
        "address": "National Highway 1A, Linh Trung, Thu Duc City",
        "lat": 10.8680,
        "lng": 106.7820,
        "category": "tech",
    },
    {
        "name": "Landmark 81 Central Park",
        "alias": ["landmark 81", "vincom landmark 81", "vinhomes central park"],
        "address": "720A Dien Bien Phu, Binh Thanh, Ho Chi Minh City",
        "lat": 10.7950,
        "lng": 106.7218,
        "category": "shopping",
    },
    {
        "name": "Tan Son Nhat International Airport",
        "alias": ["san bay tan son nhat", "airport", "tsn"],
        "address": "Truong Sa St, Tan Binh, Ho Chi Minh City",
        "lat": 10.8188,
        "lng": 106.6518,
        "category": "transit",
    },
]


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
        limit: int = 8,
    ) -> list:
        """Searches places/POIs with coordinate parsing, local curated POIs, and TomTom Search API."""
        if not query or len(query.strip()) < 1:
            return []

        clean_q = query.strip()

        # 1. Coordinate check: e.g. "10.8505, 106.758" or "10.8505 106.758"
        coord_pattern = r"^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)[,\s]+[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$"
        if re.match(coord_pattern, clean_q):
            try:
                parts = re.split(r"[,\s]+", clean_q)
                c_lat, c_lng = float(parts[0]), float(parts[1])
                rev_addr = self.reverse_geocode(c_lat, c_lng)
                dist = _haversine_km(lat, lon, c_lat, c_lng)
                return [{
                    "name": rev_addr if not rev_addr.startswith("Coordinates") else f"Pinned Location ({c_lat:.4f}, {c_lng:.4f})",
                    "address": f"GPS: {c_lat:.5f}, {c_lng:.5f}",
                    "lat": c_lat,
                    "lng": c_lng,
                    "category": "general",
                    "distance_km": round(dist, 1),
                }]
            except Exception as e:
                logger.debug(f"Coordinate parse fallback: {e}")

        normalized_query = _normalize_text(clean_q)
        matched_places = []
        seen_coords = set()

        # 2. Match against Curated Landmarks (instant zero-latency high-accuracy match)
        for lm in CURATED_LANDMARKS:
            norm_name = _normalize_text(lm["name"])
            norm_addr = _normalize_text(lm["address"])
            norm_aliases = [_normalize_text(a) for a in lm.get("alias", [])]

            is_match = False
            score = 0
            if normalized_query == norm_name or any(normalized_query == a for a in norm_aliases):
                is_match = True
                score = 100
            elif normalized_query in norm_name or any(normalized_query in a for a in norm_aliases):
                is_match = True
                score = 80
            elif any(word in norm_name or any(word in a for a in norm_aliases) for word in normalized_query.split() if len(word) >= 3):
                is_match = True
                score = 50

            if is_match:
                coord_key = (round(lm["lat"], 3), round(lm["lng"], 3))
                if coord_key not in seen_coords:
                    seen_coords.add(coord_key)
                    dist = _haversine_km(lat, lon, lm["lat"], lm["lng"])
                    matched_places.append({
                        "name": lm["name"],
                        "address": lm["address"],
                        "lat": lm["lat"],
                        "lng": lm["lng"],
                        "category": lm.get("category", "general"),
                        "distance_km": round(dist, 1),
                        "_score": score,
                    })

        # 3. Query TomTom live Search API for broad street & business coverage
        if self.api_key:
            url = f"https://api.tomtom.com/search/2/search/{requests.utils.quote(clean_q)}.json"
            params = {
                "key": self.api_key,
                "lat": lat,
                "lon": lon,
                "radius": radius,
                "countrySet": "VN",
                "limit": limit,
                "language": "en-US,vi-VN",
            }
            try:
                resp = self.session.get(url, params=params, timeout=6)
                if resp.status_code == 200:
                    results = resp.json().get("results", [])
                    for r in results:
                        poi = r.get("poi", {})
                        addr = r.get("address", {})
                        name = poi.get("name") or addr.get("freeformAddress", clean_q)
                        address = addr.get("freeformAddress", name)
                        pos = r.get("position", {})
                        p_lat = pos.get("lat")
                        p_lon = pos.get("lon")

                        if p_lat is not None and p_lon is not None:
                            coord_key = (round(p_lat, 3), round(p_lon, 3))
                            if coord_key not in seen_coords:
                                seen_coords.add(coord_key)
                                dist = _haversine_km(lat, lon, p_lat, p_lon)

                                # Map TomTom classification to category
                                cat = "general"
                                classifications = poi.get("classifications", [])
                                if classifications:
                                    code = classifications[0].get("code", "").lower()
                                    if any(k in code for k in ["college", "university", "school"]):
                                        cat = "education"
                                    elif any(k in code for k in ["hospital", "clinic", "health"]):
                                        cat = "hospital"
                                    elif any(k in code for k in ["shop", "mall", "market", "retail"]):
                                        cat = "shopping"
                                    elif any(k in code for k in ["station", "transit", "airport", "rail", "terminal"]):
                                        cat = "transit"
                                    elif any(k in code for k in ["park", "recreation", "amusement"]):
                                        cat = "park"
                                    elif any(k in code for k in ["company", "industrial", "port"]):
                                        cat = "tech"

                                matched_places.append({
                                    "name": name,
                                    "address": address,
                                    "lat": p_lat,
                                    "lng": p_lon,
                                    "category": cat,
                                    "distance_km": round(dist, 1),
                                    "_score": 60,
                                })
            except Exception as e:
                logger.warning(f"TomTom search API call failed: {e}")

        # Sort places: curated high score first, then closer distance
        matched_places.sort(key=lambda x: (-x.get("_score", 0), x.get("distance_km", 999)))

        # Clean internal fields
        for p in matched_places:
            p.pop("_score", None)

        return matched_places[:limit]

    def reverse_geocode(self, lat: float, lon: float) -> str:
        """Finds address for a coordinate point via TomTom Reverse Geocode API."""
        url = f"https://api.tomtom.com/search/2/reverseGeocode/{lat},{lon}.json"
        params = {"key": self.api_key, "language": "en-US"}
        try:
            resp = self.session.get(url, params=params, timeout=8)
            resp.raise_for_status()
            addrs = resp.json().get("addresses", [])
            if addrs:
                return addrs[0].get("address", {}).get("freeformAddress", f"Coordinates ({lat:.4f}, {lon:.4f})")
        except Exception as e:
            logger.warning(f"TomTom reverse geocode failed: {e}")
        return f"Coordinates ({lat:.4f}, {lon:.4f})"

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
                raise TomTomAPIError("No route found between the specified points")

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
            raise TomTomAPIError(f"Route calculation error: {str(e)}") from e

