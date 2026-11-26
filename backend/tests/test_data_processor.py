"""Unit tests for data processor module."""

from datetime import datetime
from pathlib import Path
import pytest

from backend.core.data_processor import DataProcessor, ValidationError
from backend.core.models import TrafficData


class TestDataProcessor:
    """Test suite for DataProcessor class."""

    @pytest.fixture
    def data_processor(self, tmp_path):
        return DataProcessor(data_dir=str(tmp_path / "data"))

    @pytest.fixture
    def valid_record_dict(self):
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
        data_dir = tmp_path / "test_data"
        processor = DataProcessor(data_dir=str(data_dir))
        assert data_dir.exists()
        assert data_dir.is_dir()

    def test_validate_record_success(self, data_processor, valid_record_dict):
        validated = data_processor.validate_record(valid_record_dict)
        assert isinstance(validated, TrafficData)
        assert validated.route_id == "route_001"
        assert validated.current_speed == 35.5
        assert validated.los == "C"

    def test_validate_record_missing_field(self, data_processor, valid_record_dict):
        invalid_record = valid_record_dict.copy()
        del invalid_record["current_speed"]
        with pytest.raises(ValidationError) as exc_info:
            data_processor.validate_record(invalid_record)
        assert "Missing required field" in str(exc_info.value)

    def test_validate_record_invalid_latitude(self, data_processor, valid_record_dict):
        invalid_record = valid_record_dict.copy()
        invalid_record["origin_lat"] = 100.0
        with pytest.raises(ValidationError) as exc_info:
            data_processor.validate_record(invalid_record)
        assert "Invalid origin_lat" in str(exc_info.value)

    def test_validate_record_invalid_longitude(self, data_processor, valid_record_dict):
        invalid_record = valid_record_dict.copy()
        invalid_record["origin_lng"] = 200.0
        with pytest.raises(ValidationError) as exc_info:
            data_processor.validate_record(invalid_record)
        assert "Invalid origin_lng" in str(exc_info.value)

    def test_validate_record_invalid_speed(self, data_processor, valid_record_dict):
        invalid_record = valid_record_dict.copy()
        invalid_record["current_speed"] = 250.0
        with pytest.raises(ValidationError) as exc_info:
            data_processor.validate_record(invalid_record)
        assert "Invalid current_speed" in str(exc_info.value)

    def test_validate_record_invalid_los(self, data_processor, valid_record_dict):
        invalid_record = valid_record_dict.copy()
        invalid_record["los"] = "X"
        with pytest.raises(ValidationError) as exc_info:
            data_processor.validate_record(invalid_record)
        assert "Invalid LOS" in str(exc_info.value)

    def test_validate_record_invalid_timestamp(self, data_processor, valid_record_dict):
        invalid_record = valid_record_dict.copy()
        invalid_record["timestamp"] = "invalid-timestamp"
        with pytest.raises(ValidationError) as exc_info:
            data_processor.validate_record(invalid_record)
        assert "Invalid timestamp format" in str(exc_info.value)

    def test_check_duplicate_detection(self, data_processor, valid_record_dict):
        validated = TrafficData(**valid_record_dict)
        assert not data_processor.check_duplicate(validated)
        assert data_processor.check_duplicate(validated)

    def test_save_to_csv_new_file(self, data_processor, valid_record_dict):
        validated = TrafficData(**valid_record_dict)
        filepath = data_processor.save_to_csv(validated)
        assert Path(filepath).exists()

        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
        assert len(lines) == 2
        assert "timestamp,route_id" in lines[0]
        assert "route_001" in lines[1]

    def test_save_to_csv_append(self, data_processor, valid_record_dict):
        validated = TrafficData(**valid_record_dict)
        data_processor.save_to_csv(validated)

        second_record = valid_record_dict.copy()
        second_record["timestamp"] = "2026-04-09T10:30:00+07:00"
        second_validated = TrafficData(**second_record)
        data_processor.save_to_csv(second_validated)

        filepath = Path(data_processor.data_dir) / "traffic_data_20260409.csv"
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
        assert len(lines) == 3

    def test_save_failed_route(self, data_processor, tmp_path):
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
        with open(failed_routes_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
        assert len(lines) == 2
        assert "route_001" in lines[1]
        assert "TomTomAPIError" in lines[1]

    def test_generate_daily_summary_no_data(self, data_processor):
        date = datetime(2026, 4, 9)
        summary = data_processor.generate_daily_summary(date)
        assert summary["date"] == "20260409"
        assert summary["total_polls"] == 0

    def test_generate_daily_summary_with_data(self, data_processor, valid_record_dict):
        validated = TrafficData(**valid_record_dict)
        data_processor.save_to_csv(validated)

        date = datetime(2026, 4, 9)
        summary = data_processor.generate_daily_summary(date)
        assert summary["date"] == "20260409"
        assert summary["total_polls"] == 1
        assert summary["success_rate"] == 100.0

    def test_save_daily_summary(self, data_processor, tmp_path):
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
