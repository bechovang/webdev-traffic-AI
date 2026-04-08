"""Unit tests for data processor module."""

import pytest
from datetime import datetime
from pathlib import Path

from src.data_processor import DataProcessor, ValidationError
from src.models import TrafficData


class TestDataProcessor:
    """Test suite for DataProcessor class."""

    @pytest.fixture
    def data_processor(self, tmp_path):
        """Create data processor instance with temporary directory."""
        return DataProcessor(data_dir=str(tmp_path / "data"))

    @pytest.fixture
    def valid_record_dict(self):
        """Create valid traffic data record dict."""
        return {
            "timestamp": "2026-04-09T10:15:00+07:00",
            "route_id": "route_001",
            "route_name": "Test Route",
            "origin_lat": 10.862,
            "origin_lng": 106.775,
            "dest_lat": 10.835,
            "dest_lng": 106.782,
            "current_speed": 35.5,
            "free_flow_speed": 50.0,
            "travel_time_seconds": 480,
            "congestion_level": "Moderate",
            "los": "C",
        }

    def test_init_creates_directory(self, tmp_path):
        """Test that initialization creates data directory."""
        data_dir = tmp_path / "test_data"
        processor = DataProcessor(data_dir=str(data_dir))

        assert data_dir.exists()
        assert data_dir.is_dir()

    def test_validate_record_success(self, data_processor, valid_record_dict):
        """Test successful record validation."""
        validated = data_processor.validate_record(valid_record_dict)

        assert isinstance(validated, TrafficData)
        assert validated.route_id == "route_001"
        assert validated.current_speed == 35.5
        assert validated.los == "C"

    def test_validate_record_missing_field(self, data_processor, valid_record_dict):
        """Test validation with missing required field."""
        invalid_record = valid_record_dict.copy()
        del invalid_record["current_speed"]

        with pytest.raises(ValidationError) as exc_info:
            data_processor.validate_record(invalid_record)

        assert "Missing required field" in str(exc_info.value)

    def test_validate_record_invalid_latitude(self, data_processor, valid_record_dict):
        """Test validation with invalid latitude."""
        invalid_record = valid_record_dict.copy()
        invalid_record["origin_lat"] = 100.0  # Invalid: > 90

        with pytest.raises(ValidationError) as exc_info:
            data_processor.validate_record(invalid_record)

        assert "Invalid origin_lat" in str(exc_info.value)

    def test_validate_record_invalid_longitude(self, data_processor, valid_record_dict):
        """Test validation with invalid longitude."""
        invalid_record = valid_record_dict.copy()
        invalid_record["origin_lng"] = 200.0  # Invalid: > 180

        with pytest.raises(ValidationError) as exc_info:
            data_processor.validate_record(invalid_record)

        assert "Invalid origin_lng" in str(exc_info.value)

    def test_validate_record_invalid_speed(self, data_processor, valid_record_dict):
        """Test validation with invalid speed."""
        invalid_record = valid_record_dict.copy()
        invalid_record["current_speed"] = 250.0  # Invalid: > 200

        with pytest.raises(ValidationError) as exc_info:
            data_processor.validate_record(invalid_record)

        assert "Invalid current_speed" in str(exc_info.value)

    def test_validate_record_invalid_los(self, data_processor, valid_record_dict):
        """Test validation with invalid LOS."""
        invalid_record = valid_record_dict.copy()
        invalid_record["los"] = "X"  # Invalid: not A-F

        with pytest.raises(ValidationError) as exc_info:
            data_processor.validate_record(invalid_record)

        assert "Invalid LOS" in str(exc_info.value)

    def test_validate_record_invalid_timestamp(self, data_processor, valid_record_dict):
        """Test validation with invalid timestamp format."""
        invalid_record = valid_record_dict.copy()
        invalid_record["timestamp"] = "invalid-timestamp"

        with pytest.raises(ValidationError) as exc_info:
            data_processor.validate_record(invalid_record)

        assert "Invalid timestamp format" in str(exc_info.value)

    def test_check_duplicate_detection(self, data_processor, valid_record_dict):
        """Test duplicate detection."""
        validated = TrafficData(**valid_record_dict)

        # First check should not be duplicate
        assert not data_processor.check_duplicate(validated)

        # Second check should be duplicate
        assert data_processor.check_duplicate(validated)

    def test_save_to_csv_new_file(self, data_processor, valid_record_dict):
        """Test saving to new CSV file."""
        validated = TrafficData(**valid_record_dict)

        filepath = data_processor.save_to_csv(validated)

        assert Path(filepath).exists()

        # Verify file contents
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()

        assert len(lines) == 2  # Header + 1 data row
        assert "timestamp,route_id" in lines[0]  # Header
        assert "route_001" in lines[1]  # Data row

    def test_save_to_csv_append(self, data_processor, valid_record_dict):
        """Test appending to existing CSV file."""
        validated = TrafficData(**valid_record_dict)

        # Save first record
        data_processor.save_to_csv(validated)

        # Create second record
        second_record = valid_record_dict.copy()
        second_record["timestamp"] = "2026-04-09T10:30:00+07:00"
        second_validated = TrafficData(**second_record)

        # Save second record
        data_processor.save_to_csv(second_validated)

        # Verify file contents
        filepath = Path(data_processor.data_dir) / "traffic_data_20260409.csv"
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()

        assert len(lines) == 3  # Header + 2 data rows

    def test_save_failed_route(self, data_processor, tmp_path):
        """Test logging failed route to dead letter queue."""
        failed_routes_file = tmp_path / "data" / "failed_routes.csv"

        data_processor.save_failed_route(
            route_id="route_001",
            route_name="Test Route",
            error_type="TomTomAPIError",
            error_message="Connection timeout",
            retry_attempts=3,
            failed_routes_file=str(failed_routes_file),
        )

        assert failed_routes_file.exists()

        # Verify file contents
        with open(failed_routes_file, "r", encoding="utf-8") as f:
            lines = f.readlines()

        assert len(lines) == 2  # Header + 1 data row
        assert "route_001" in lines[1]
        assert "TomTomAPIError" in lines[1]

    def test_generate_daily_summary_no_data(self, data_processor):
        """Test summary generation with no data file."""
        date = datetime(2026, 4, 9)
        summary = data_processor.generate_daily_summary(date)

        assert summary["date"] == "20260409"
        assert summary["total_polls"] == 0
        assert summary["successful"] == 0
        assert summary["success_rate"] == 0.0

    def test_generate_daily_summary_with_data(self, data_processor, valid_record_dict):
        """Test summary generation with data file."""
        # Create a data file
        validated = TrafficData(**valid_record_dict)
        data_processor.save_to_csv(validated)

        date = datetime(2026, 4, 9)
        summary = data_processor.generate_daily_summary(date)

        assert summary["date"] == "20260409"
        assert summary["total_polls"] == 1
        assert summary["successful"] == 1
        assert summary["success_rate"] == 100.0

    def test_save_daily_summary(self, data_processor, tmp_path):
        """Test saving daily summary to file."""
        reports_dir = tmp_path / "reports"
        summary = {
            "date": "20260409",
            "total_polls": 96,
            "successful": 95,
            "failed": 1,
            "success_rate": 98.96,
        }

        data_processor.save_daily_summary(summary, str(reports_dir))

        summary_file = reports_dir / "summary_20260409.csv"
        assert summary_file.exists()

        # Verify file contents
        with open(summary_file, "r", encoding="utf-8") as f:
            content = f.read()

        assert "20260409" in content
        assert "96" in content
