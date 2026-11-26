"""Configuration loader and validator for unified backend."""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from dotenv import load_dotenv


class Config:
    """Configuration manager for traffic backend and scraper."""

    def __init__(self, env_path: Optional[Path] = None, base_dir: Optional[Path] = None):
        """Initialize configuration from environment and YAML files."""
        self.base_dir = base_dir or Path(__file__).resolve().parent.parent

        # Try to load .env from backend/ or project root
        dotenv_target = env_path or (self.base_dir / ".env")
        if not dotenv_target.exists():
            root_dotenv = self.base_dir.parent / ".env"
            if root_dotenv.exists():
                dotenv_target = root_dotenv
        load_dotenv(dotenv_path=dotenv_target)

        # TomTom API Key (optional for simulation mode, mandatory for live scraper)
        self.tomtom_api_key = os.getenv("TOMTOM_API_KEY", "")

        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        self.data_dir = os.getenv("DATA_DIR", "data/scraped_data")
        self.logs_dir = os.getenv("LOGS_DIR", "logs")

        yaml_config = self._load_yaml_config()
        self.routes = self._extract_and_validate_routes(yaml_config)
        self.scraper_config: Dict[str, Any] = yaml_config.get("scraper", {})
        self.storage_config: Dict[str, Any] = yaml_config.get("storage", {})
        self.logging_config: Dict[str, Any] = yaml_config.get("logging", {})

    def get_required_api_key(self) -> str:
        """Returns API key or raises error if not configured."""
        placeholder = "your_tomtom_api_key_here"
        if not self.tomtom_api_key or self.tomtom_api_key.strip().lower() in {placeholder, ""}:
            raise ValueError(
                "Required environment variable 'TOMTOM_API_KEY' is not set. "
                "Please set it in your .env file."
            )
        return self.tomtom_api_key.strip()

    def _load_yaml_config(self) -> Dict[str, Any]:
        """Loads the main YAML configuration file."""
        routes_file = self.base_dir / "config" / "routes.yaml"
        if not routes_file.exists():
            raise FileNotFoundError(f"Routes configuration file not found: {routes_file}")

        with open(routes_file, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    def _extract_and_validate_routes(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extracts and validates route definitions."""
        routes = config.get("routes", [])
        if not routes:
            raise ValueError("No routes defined in configuration file")

        for route in routes:
            self._validate_route(route)

        return routes

    def _validate_route(self, route: Dict[str, Any]) -> None:
        """Validates a single route definition."""
        required_fields = ["id", "name", "origin", "destination"]
        for field in required_fields:
            if field not in route:
                raise ValueError(f"Route missing required field: {field}")

        for point_name in ["origin", "destination"]:
            point = route[point_name]
            if "lat" not in point or "lng" not in point:
                raise ValueError(f"Route {route['id']}: {point_name} missing lat/lng")

            lat, lng = point["lat"], point["lng"]
            if not -90 <= lat <= 90:
                raise ValueError(f"Route {route['id']}: Invalid latitude {lat}")
            if not -180 <= lng <= 180:
                raise ValueError(f"Route {route['id']}: Invalid longitude {lng}")

    def get_interval_minutes(self) -> int:
        """Returns polling interval in minutes."""
        env_interval = os.getenv("POLLING_INTERVAL_MINUTES")
        if env_interval:
            return int(env_interval)
        return int(self.scraper_config.get("interval_minutes", 15))

    def get_collection_days(self) -> int:
        """Returns collection duration in days."""
        env_days = os.getenv("COLLECTION_DAYS")
        if env_days:
            return int(env_days)
        return int(self.scraper_config.get("collection_days", 7))

    def ensure_directories(self) -> None:
        """Ensures all required output and log directories exist."""
        directories = [
            self.base_dir / self.data_dir,
            self.base_dir / self.storage_config.get("reports_dir", "data/reports"),
            self.base_dir / self.logs_dir,
        ]
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)


_config: Optional[Config] = None


def get_config() -> Config:
    """Returns singleton Config instance."""
    global _config
    if _config is None:
        _config = Config()
    return _config
