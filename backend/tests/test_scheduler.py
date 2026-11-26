"""Unit tests for scheduler module."""

import signal
from datetime import datetime
from pathlib import Path
from unittest.mock import Mock, patch
import pytest

from backend.services.scheduler import TrafficScheduler


class TestTrafficScheduler:
    """Test suite for TrafficScheduler class."""

    @pytest.fixture
    def mock_config(self, tmp_path):
        cfg = Mock()
        cfg.tomtom_api_key = "test_key"
        cfg.get_required_api_key.return_value = "test_key"
        cfg.base_dir = tmp_path
        cfg.data_dir = "data/test"
        cfg.logs_dir = "logs/test"
        cfg.routes = []
        cfg.storage_config = {
            "reports_dir": "data/reports",
            "failed_routes_file": "data/failed_routes.csv",
        }
        cfg.ensure_directories = Mock()
        cfg.get_interval_minutes = Mock(return_value=15)
        cfg.get_collection_days = Mock(return_value=7)
        return cfg

    @pytest.fixture
    def scheduler(self, mock_config):
        return TrafficScheduler(config=mock_config)

    def test_init(self, scheduler):
        assert scheduler.scheduler is None
        assert scheduler.api_client is None
        assert scheduler.data_processor is None
        assert scheduler.total_polls == 0

    @patch("backend.services.scheduler.TrafficAPIClient")
    @patch("backend.services.scheduler.DataProcessor")
    @patch("backend.services.scheduler.BackgroundScheduler")
    def test_start_success(
        self,
        mock_scheduler_class,
        mock_processor_class,
        mock_client_class,
        mock_config,
    ):
        mock_scheduler_instance = Mock()
        mock_scheduler_instance.start = Mock()
        mock_scheduler_class.return_value = mock_scheduler_instance

        mock_client_instance = Mock()
        mock_client_class.return_value = mock_client_instance

        mock_processor_instance = Mock()
        mock_processor_class.return_value = mock_processor_instance

        scheduler = TrafficScheduler(config=mock_config)
        scheduler.start()

        assert scheduler.api_client == mock_client_instance
        assert scheduler.data_processor == mock_processor_instance
        mock_config.ensure_directories.assert_called_once()
        mock_scheduler_instance.add_job.assert_called_once()
        mock_scheduler_instance.start.assert_called_once()

    def test_signal_handler(self, scheduler):
        mock_scheduler_instance = Mock()
        mock_scheduler_instance.running = True
        mock_scheduler_instance.shutdown = Mock()
        scheduler.scheduler = mock_scheduler_instance

        with pytest.raises(SystemExit) as exc_info:
            scheduler._signal_handler(signal.SIGINT, None)
        assert exc_info.value.code == 0

    def test_stop(self, scheduler):
        mock_scheduler_instance = Mock()
        mock_scheduler_instance.running = True
        mock_scheduler_instance.shutdown = Mock()
        scheduler.scheduler = mock_scheduler_instance

        scheduler.total_polls = 100
        scheduler.successful_polls = 95
        scheduler.failed_polls = 5

        with pytest.raises(SystemExit) as exc_info:
            scheduler.stop()
        assert exc_info.value.code == 0

    def test_poll_all_routes_success(self, mock_config):
        mock_config.routes = [
            {
                "id": "route_001",
                "name": "Test Route 1",
                "origin": {"lat": 10.862, "lng": 106.775},
                "destination": {"lat": 10.835, "lng": 106.782},
            }
        ]
        scheduler = TrafficScheduler(config=mock_config)

        mock_api_response = Mock()
        mock_api_response.route_id = "route_001"
        mock_api_response.distance_meters = 3000
        mock_api_response.travel_time_seconds = 300
        mock_api_response.traffic_time_seconds = 480

        mock_api_client = Mock()
        mock_api_client.fetch_route_data.return_value = mock_api_response
        mock_api_client.calculate_traffic_metrics.return_value = {
            "route_id": "route_001",
            "route_name": "Test Route 1",
            "origin_lat": 10.862,
            "origin_lng": 106.775,
            "dest_lat": 10.835,
            "dest_lng": 106.782,
            "current_speed": 22.5,
            "free_flow_speed": 36.0,
            "travel_time_seconds": 480,
            "congestion_level": "Moderate",
            "los": "C",
        }
        scheduler.api_client = mock_api_client

        mock_data_processor = Mock()
        mock_validated_data = Mock()
        mock_data_processor.validate_record.return_value = mock_validated_data
        mock_data_processor.check_duplicate.return_value = False
        mock_data_processor.save_to_csv = Mock()
        scheduler.data_processor = mock_data_processor

        scheduler._poll_all_routes()

        assert scheduler.total_polls == 1
        assert scheduler.successful_polls == 1
        assert scheduler.failed_polls == 0

    def test_generate_daily_summary(self, scheduler, mock_config):
        mock_data_processor = Mock()
        mock_data_processor.generate_daily_summary.return_value = {
            "date": "20260409",
            "total_polls": 96,
            "successful": 95,
            "failed": 1,
            "success_rate": 98.96,
        }
        scheduler.data_processor = mock_data_processor

        date = datetime(2026, 4, 9, 0, 5)
        scheduler._generate_daily_summary(date)

        mock_data_processor.generate_daily_summary.assert_called_once_with(date)
        expected_reports_dir = str(Path(mock_config.base_dir) / "data/reports")
        mock_data_processor.save_daily_summary.assert_called_once_with(
            mock_data_processor.generate_daily_summary.return_value,
            expected_reports_dir,
        )
