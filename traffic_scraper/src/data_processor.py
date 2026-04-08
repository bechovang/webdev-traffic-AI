"""Data validation and storage for traffic scraper."""

import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from src.logger import get_logger
from src.models import CSV_HEADERS, FAILED_ROUTES_HEADERS, TrafficData

logger = get_logger()


class ValidationError(Exception):
    """Custom exception for data validation errors."""

    pass


class DataProcessor:
    """Handle data validation and CSV storage for traffic data."""

    def __init__(self, data_dir: str):
        """Initialize data processor.

        Args:
            data_dir: Directory for storing CSV files
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # Track existing data for deduplication
        self._existing_records = set()

    def validate_record(self, record: Dict) -> TrafficData:
        """Validate a traffic data record.

        Args:
            record: Dictionary with traffic data fields

        Returns:
            Validated TrafficData object

        Raises:
            ValidationError: If validation fails
        """
        # Check required fields
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

        # Validate coordinates
        for field in ["origin_lat", "dest_lat"]:
            value = record[field]
            if not isinstance(value, (int, float)) or not -90 <= value <= 90:
                raise ValidationError(f"Invalid {field}: {value}")

        for field in ["origin_lng", "dest_lng"]:
            value = record[field]
            if not isinstance(value, (int, float)) or not -180 <= value <= 180:
                raise ValidationError(f"Invalid {field}: {value}")

        # Validate speeds
        for field in ["current_speed", "free_flow_speed"]:
            value = record[field]
            if not isinstance(value, (int, float)) or not 0 <= value <= 200:
                raise ValidationError(f"Invalid {field}: {value}")

        # Validate travel time
        travel_time = record["travel_time_seconds"]
        if not isinstance(travel_time, int) or travel_time <= 0:
            raise ValidationError(f"Invalid travel_time_seconds: {travel_time}")

        # Validate LOS
        los = record["los"]
        if los not in ["A", "B", "C", "D", "E", "F"]:
            raise ValidationError(f"Invalid LOS: {los}")

        # Validate timestamp format
        try:
            datetime.fromisoformat(record["timestamp"].replace("Z", "+00:00"))
        except ValueError:
            raise ValidationError(f"Invalid timestamp format: {record['timestamp']}")

        return TrafficData(**record)

    def check_duplicate(self, record: TrafficData) -> bool:
        """Check if record already exists (for deduplication).

        Args:
            record: TrafficData object to check

        Returns:
            True if duplicate, False otherwise
        """
        # Create unique key: route_id + timestamp
        key = f"{record.route_id}_{record.timestamp}"

        if key in self._existing_records:
            logger.warning(f"Duplicate record detected: {key}")
            return True

        self._existing_records.add(key)
        return False

    def save_to_csv(self, record: TrafficData) -> str:
        """Save a single traffic data record to CSV file.

        Args:
            record: Validated TrafficData object

        Returns:
            Path to CSV file

        Raises:
            IOError: If file write fails
        """
        # Generate daily filename
        date_str = datetime.now().strftime("%Y%m%d")
        filename = f"traffic_data_{date_str}.csv"
        filepath = self.data_dir / filename

        # Check if file exists
        file_exists = filepath.exists()

        try:
            with open(filepath, "a", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)

                # Write header if new file
                if not file_exists:
                    writer.writerow(CSV_HEADERS)

                # Write data row
                writer.writerow(record.to_csv_row().split(","))

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
        failed_routes_file: str = "data/failed_routes.csv",
    ) -> None:
        """Log a failed route to the dead letter queue.

        Args:
            route_id: Route identifier
            route_name: Human-readable route name
            error_type: Type of error
            error_message: Error message
            retry_attempts: Number of retry attempts
            failed_routes_file: Path to failed routes CSV file
        """
        filepath = Path(failed_routes_file)
        filepath.parent.mkdir(parents=True, exist_ok=True)

        file_exists = filepath.exists()

        try:
            with open(filepath, "a", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)

                # Write header if new file
                if not file_exists:
                    writer.writerow(FAILED_ROUTES_HEADERS)

                # Write failure record
                timestamp = datetime.now().isoformat()
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

    def generate_daily_summary(self, date: datetime) -> Dict[str, int]:
        """Generate daily summary statistics.

        Args:
            date: Date to generate summary for

        Returns:
            Dictionary with summary statistics
        """
        date_str = date.strftime("%Y%m%d")
        filename = f"traffic_data_{date_str}.csv"
        filepath = self.data_dir / filename

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
                for row in reader:
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

    def save_daily_summary(self, summary: Dict[str, int], reports_dir: str) -> None:
        """Save daily summary to CSV file.

        Args:
            summary: Summary statistics dictionary
            reports_dir: Directory for summary reports
        """
        reports_path = Path(reports_dir)
        reports_path.mkdir(parents=True, exist_ok=True)

        date_str = summary["date"]
        filename = f"summary_{date_str}.csv"
        filepath = reports_path / filename

        try:
            with open(filepath, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(summary.keys())
                writer.writerow(summary.values())

            logger.info(f"Saved daily summary to {filepath}")

        except IOError as e:
            logger.error(f"Failed to write summary file: {str(e)}")
