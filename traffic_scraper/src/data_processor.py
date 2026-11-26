"""Data validation and storage for traffic scraper."""

import csv
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from src.logger import get_logger
from src.models import CSV_HEADERS, FAILED_ROUTES_HEADERS, TrafficData

logger = get_logger()


class ValidationError(Exception):
    """Custom exception for data validation errors."""


class DataProcessor:
    """Handle data validation and CSV storage for traffic data."""

    def __init__(self, data_dir: str, failed_routes_file: Optional[str] = None):
        """Initialize data processor."""
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.failed_routes_file = failed_routes_file or "data/failed_routes.csv"
        self._existing_records: set[str] = set()

    def validate_record(self, record: Dict[str, Any]) -> TrafficData:
        """Validate a traffic data record and return a TrafficData instance."""
        required_fields = [
            "timestamp",
            "route_id",
            "route_name",
            "origin_lat",
            "origin_lng",
            "dest_lat",
            "dest_lng",
            "current_speed",
            "free_flow_speed",
            "travel_time_seconds",
            "congestion_level",
            "los",
        ]

        for field in required_fields:
            if field not in record:
                raise ValidationError(f"Missing required field: {field}")

        for field in ["origin_lat", "dest_lat"]:
            value = record[field]
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not -90 <= value <= 90:
                raise ValidationError(f"Invalid {field}: {value}")

        for field in ["origin_lng", "dest_lng"]:
            value = record[field]
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not -180 <= value <= 180:
                raise ValidationError(f"Invalid {field}: {value}")

        for field in ["current_speed", "free_flow_speed"]:
            value = record[field]
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not 0 <= value <= 200:
                raise ValidationError(f"Invalid {field}: {value}")

        travel_time = record["travel_time_seconds"]
        if isinstance(travel_time, bool) or not isinstance(travel_time, int) or travel_time <= 0:
            raise ValidationError(f"Invalid travel_time_seconds: {travel_time}")

        los = record["los"]
        if los not in {"A", "B", "C", "D", "E", "F"}:
            raise ValidationError(f"Invalid LOS: {los}")

        try:
            datetime.fromisoformat(str(record["timestamp"]).replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValidationError(f"Invalid timestamp format: {record['timestamp']}") from exc

        return TrafficData(**record)

    def check_duplicate(self, record: TrafficData) -> bool:
        """Check if record already exists in the current session."""
        key = f"{record.route_id}_{record.timestamp}"
        if key in self._existing_records:
            logger.warning(f"Duplicate record detected: {key}")
            return True
        self._existing_records.add(key)
        return False

    def save_to_csv(self, record: TrafficData) -> str:
        """Save a single traffic data record to its daily CSV file."""
        try:
            record_dt = datetime.fromisoformat(record.timestamp.replace("Z", "+00:00"))
        except ValueError:
            record_dt = datetime.now()

        date_str = record_dt.strftime("%Y%m%d")
        filepath = self.data_dir / f"traffic_data_{date_str}.csv"
        file_exists = filepath.exists()

        try:
            with open(filepath, "a", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                if not file_exists:
                    writer.writerow(CSV_HEADERS)
                writer.writerow(list(record.to_dict().values()))

            logger.info(
                "Saved traffic data to CSV",
                extra={
                    "route_id": record.route_id,
                    "file": str(filepath),
                    "congestion_level": record.congestion_level,
                },
            )
            return str(filepath)

        except IOError as e:
            logger.error(f"Failed to write to CSV file {filepath}: {str(e)}")
            raise

    def save_failed_route(
        self,
        route_id: str,
        route_name: str,
        error_type: str,
        error_message: str,
        retry_attempts: int,
        failed_routes_file: Optional[str] = None,
    ) -> None:
        """Log a failed route to the dead letter queue CSV file."""
        filepath = Path(failed_routes_file or self.failed_routes_file)
        filepath.parent.mkdir(parents=True, exist_ok=True)
        file_exists = filepath.exists()

        try:
            with open(filepath, "a", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                if not file_exists:
                    writer.writerow(FAILED_ROUTES_HEADERS)

                timestamp = datetime.now().astimezone().isoformat()
                writer.writerow(
                    [timestamp, route_id, route_name, error_type, error_message, retry_attempts]
                )

            logger.warning(
                "Logged failed route to dead letter queue",
                extra={
                    "route_id": route_id,
                    "error_type": error_type,
                    "retry_attempts": retry_attempts,
                },
            )
        except IOError as e:
            logger.error(f"Failed to write to failed routes file: {str(e)}")

    def generate_daily_summary(self, date: datetime) -> Dict[str, Any]:
        """Generate daily summary statistics from the daily CSV file."""
        date_str = date.strftime("%Y%m%d")
        filepath = self.data_dir / f"traffic_data_{date_str}.csv"

        if not filepath.exists():
            return {
                "date": date_str,
                "total_polls": 0,
                "successful": 0,
                "failed": 0,
                "success_rate": 0.0,
            }

        total_polls = 0
        failed = 0

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for _ in reader:
                    total_polls += 1

            successful = total_polls - failed
            success_rate = (successful / total_polls * 100) if total_polls > 0 else 0.0

            return {
                "date": date_str,
                "total_polls": total_polls,
                "successful": successful,
                "failed": failed,
                "success_rate": round(success_rate, 2),
            }
        except IOError as e:
            logger.error(f"Failed to read data file for summary: {str(e)}")
            return {
                "date": date_str,
                "total_polls": 0,
                "successful": 0,
                "failed": 0,
                "success_rate": 0.0,
            }

    def save_daily_summary(self, summary: Dict[str, Any], reports_dir: str) -> None:
        """Save daily summary to CSV file."""
        reports_path = Path(reports_dir)
        reports_path.mkdir(parents=True, exist_ok=True)

        date_str = summary["date"]
        filepath = reports_path / f"summary_{date_str}.csv"

        try:
            with open(filepath, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(summary.keys())
                writer.writerow(summary.values())

            logger.info(f"Saved daily summary to {filepath}")
        except IOError as e:
            logger.error(f"Failed to write summary file: {str(e)}")
