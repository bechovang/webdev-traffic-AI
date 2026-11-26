"""Configuration loader and validator for traffic scraper."""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from dotenv import load_dotenv


class Config:
    """Configuration manager for traffic scraper."""

    def __init__(self, env_path: Optional[Path] = None):
        """Initialize configuration from environment and YAML files."""
        load_dotenv(dotenv_path=env_path)

        self.base_dir = Path(__file__).resolve().parent.parent
        self.tomtom_api_key = self._get_required_env("TOMTOM_API_KEY")

        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        self.data_dir = os.getenv("DATA_DIR", "data/scraped_data")
        self.logs_dir = os.getenv("LOGS_DIR", "logs")

        yaml_config = self._load_yaml_config()
        self.routes = self._extract_and_validate_routes(yaml_config)
        self.scraper_config: Dict[str, Any] = yaml_config.get("scraper", {})
        self.storage_config: Dict[str, Any] = yaml_config.get("storage", {})
        self.logging_config: Dict[str, Any] = yaml_config.get("logging", {})

    def _get_required_env(self, key: str) -> str:
        """Get required environment variable and reject placeholder values."""
        value = os.getenv(key)
        placeholder = f"your_{key.lower()}_here"
        if not value or value.strip().lower() in {placeholder, ""}:
            raise ValueError(
                f"Required environment variable '{key}' is not set. "
                "Please set it in your .env file."
            )
        return value.strip()

    def _load_yaml_config(self) -> Dict[str, Any]:
        """Load the main YAML configuration file once."""
        routes_file = self.base_dir / "config" / "routes.yaml"
        if not routes_file.exists():
            raise FileNotFoundError(f"Routes configuration file not found: {routes_file}")

        with open(routes_file, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    def _extract_and_validate_routes(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract and validate route definitions from parsed YAML config."""
        routes = config.get("routes", [])
        if not routes:
            raise ValueError("No routes defined in configuration file")

        for route in routes:
            self._validate_route(route)

        return routes

    def _validate_route(self, route: Dict[str, Any]) -> None:
        """Validate a single route configuration."""
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
        """Get polling interval in minutes (env var overrides YAML)."""
        env_interval = os.getenv("POLLING_INTERVAL_MINUTES")
        if env_interval:
            return int(env_interval)
        return int(self.scraper_config.get("interval_minutes", 15))

    def get_collection_days(self) -> int:
        """Get collection duration in days (env var overrides YAML)."""
        env_days = os.getenv("COLLECTION_DAYS")
        if env_days:
            return int(env_days)
        return int(self.scraper_config.get("collection_days", 7))

    def ensure_directories(self) -> None:
        """Ensure all required output and log directories exist."""
        directories = [
            self.base_dir / self.data_dir,
            self.base_dir / self.storage_config.get("reports_dir", "data/reports"),
            self.base_dir / self.logs_dir,
        ]
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)


_config: Optional[Config] = None


def get_config() -> Config:
    """Get or initialize the global configuration instance."""
    global _config
    if _config is None:
        _config = Config()
    return _config
