"""Configuration loader and validator for traffic scraper."""

import os
from pathlib import Path
from typing import Any, Dict, List

import yaml
from dotenv import load_dotenv


class Config:
    """Configuration manager for traffic scraper."""

    def __init__(self):
        """Initialize configuration from environment and YAML files."""
        # Load environment variables from .env
        load_dotenv()

        # Base directory
        self.base_dir = Path(__file__).parent.parent

        # Load API configuration
        self.tomtom_api_key = self._get_required_env("TOMTOM_API_KEY")

        # Load scraper configuration
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        self.data_dir = os.getenv("DATA_DIR", "data/scraped_data")
        self.logs_dir = os.getenv("LOGS_DIR", "logs")

        # Load routes from YAML
        self.routes = self._load_routes()
        self.scraper_config = self._load_scraper_config()
        self.storage_config = self._load_storage_config()
        self.logging_config = self._load_logging_config()

    def _get_required_env(self, key: str) -> str:
        """Get required environment variable.

        Args:
            key: Environment variable name

        Returns:
            Environment variable value

        Raises:
            ValueError: If environment variable is not set
        """
        value = os.getenv(key)
        if not value or value == f"YOUR_{key}_HERE":
            raise ValueError(
                f"Required environment variable '{key}' is not set. "
                f"Please set it in your .env file."
            )
        return value

    def _load_routes(self) -> List[Dict[str, Any]]:
        """Load route configurations from YAML file.

        Returns:
            List of route configurations
        """
        routes_file = self.base_dir / "config" / "routes.yaml"

        if not routes_file.exists():
            raise FileNotFoundError(f"Routes configuration file not found: {routes_file}")

        with open(routes_file, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)

        routes = config.get("routes", [])

        if not routes:
            raise ValueError("No routes defined in configuration file")

        # Validate routes
        for route in routes:
            self._validate_route(route)

        return routes

    def _validate_route(self, route: Dict[str, Any]) -> None:
        """Validate route configuration.

        Args:
            route: Route configuration dict

        Raises:
            ValueError: If route configuration is invalid
        """
        required_fields = ["id", "name", "origin", "destination"]
        for field in required_fields:
            if field not in route:
                raise ValueError(f"Route missing required field: {field}")

        # Validate coordinates
        for point_name in ["origin", "destination"]:
            point = route[point_name]
            if "lat" not in point or "lng" not in point:
                raise ValueError(f"Route {route['id']}: {point_name} missing lat/lng")

            lat, lng = point["lat"], point["lng"]
            if not -90 <= lat <= 90:
                raise ValueError(f"Route {route['id']}: Invalid latitude {lat}")
            if not -180 <= lng <= 180:
                raise ValueError(f"Route {route['id']}: Invalid longitude {lng}")

    def _load_scraper_config(self) -> Dict[str, Any]:
        """Load scraper configuration from YAML file.

        Returns:
            Scraper configuration dict
        """
        routes_file = self.base_dir / "config" / "routes.yaml"

        with open(routes_file, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)

        return config.get("scraper", {})

    def _load_storage_config(self) -> Dict[str, Any]:
        """Load storage configuration from YAML file.

        Returns:
            Storage configuration dict
        """
        routes_file = self.base_dir / "config" / "routes.yaml"

        with open(routes_file, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)

        return config.get("storage", {})

    def _load_logging_config(self) -> Dict[str, Any]:
        """Load logging configuration from YAML file.

        Returns:
            Logging configuration dict
        """
        routes_file = self.base_dir / "config" / "routes.yaml"

        with open(routes_file, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)

        return config.get("logging", {})

    def get_interval_minutes(self) -> int:
        """Get polling interval in minutes.

        Returns:
            Polling interval in minutes
        """
        # Check env var first, then YAML config, then default
        env_interval = os.getenv("POLLING_INTERVAL_MINUTES")
        if env_interval:
            return int(env_interval)

        return self.scraper_config.get("interval_minutes", 15)

    def get_collection_days(self) -> int:
        """Get collection duration in days.

        Returns:
            Collection duration in days
        """
        # Check env var first, then YAML config, then default
        env_days = os.getenv("COLLECTION_DAYS")
        if env_days:
            return int(env_days)

        return self.scraper_config.get("collection_days", 7)

    def ensure_directories(self) -> None:
        """Ensure all required directories exist."""
        directories = [
            self.base_dir / self.data_dir,
            self.base_dir / self.storage_config.get("reports_dir", "data/reports"),
            self.base_dir / self.logs_dir,
        ]

        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)


# Global config instance
_config = None


def get_config() -> Config:
    """Get global configuration instance.

    Returns:
        Config instance
    """
    global _config
    if _config is None:
        _config = Config()
    return _config
