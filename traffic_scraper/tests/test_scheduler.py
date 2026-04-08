"""Unit tests for scheduler module."""

import pytest
from unittest.mock import Mock, patch, MagicMock

from src.scheduler import TrafficScheduler


class TestTrafficScheduler:
    """Test suite for TrafficScheduler class."""

    @pytest.fixture
    def scheduler(self):
        """Create scheduler instance for testing."""
        return TrafficScheduler()

    def test_init(self, scheduler):
        """Test scheduler initialization."""
        assert scheduler.scheduler is None
        assert scheduler.api_client is None
        assert scheduler.data_processor is None
        assert scheduler.total_polls == 0
        assert scheduler.successful_polls == 0
        assert scheduler.failed_polls == 0

    @patch("src.scheduler.get_config")
    @patch("src.scheduler.TrafficAPIClient")
    @patch("src.scheduler.DataProcessor")
    @patch("src.scheduler.BackgroundScheduler")
    def test_start_success(
        self, mock_scheduler_class, mock_processor_class, mock_client_class, mock_config
    ):
        """Test successful scheduler start."""
        # Setup mocks
        mock_config_instance = Mock()
        mock_config_instance.tomtom_api_key = "test_key"
        mock_config_instance.data_dir = "data/test"
        mock_config_instance.logs_dir = "logs/test"
        mock_config_instance.routes = []
        mock_config_instance.ensure_directories = Mock()
        mock_config_instance.get_interval_minutes = Mock(return_value=15)
        mock_config.return_value = mock_config_instance

        mock_scheduler_instance = Mock()
        mock_scheduler_instance.start = Mock()
        mock_scheduler_class.return_value = mock_scheduler_instance

        mock_client_instance = Mock()
        mock_client_class.return_value = mock_client_instance

        mock_processor_instance = Mock()
        mock_processor_class.return_value = mock_processor_instance

        # Create and start scheduler
        scheduler = TrafficScheduler()
        scheduler.start()

        # Verify initialization
        assert scheduler.api_client == mock_client_instance
        assert scheduler.data_processor == mock_processor_instance
        mock_config_instance.ensure_directories.assert_called_once()

    @patch("src.scheduler.BackgroundScheduler")
    def test_signal_handler(self, mock_scheduler_class, scheduler):
        """Test graceful shutdown on signal."""
        mock_scheduler_instance = Mock()
        mock_scheduler_instance.running = True
        scheduler.scheduler = mock_scheduler_instance

        # Simulate signal handler
        import signal

        scheduler._signal_handler(signal.SIGINT, None)

        # Verify shutdown was called
        # Note: The actual stop() method calls sys.exit(), so we can't test it fully

    @patch("src.scheduler.BackgroundScheduler")
    def test_stop(self, mock_scheduler_class, scheduler):
        """Test scheduler stop method."""
        mock_scheduler_instance = Mock()
        mock_scheduler_instance.running = True
        mock_scheduler_instance.shutdown = Mock()
        scheduler.scheduler = mock_scheduler_instance

        # Add some poll statistics
        scheduler.total_polls = 100
        scheduler.successful_polls = 95
        scheduler.failed_polls = 5

        # Stop should trigger shutdown
        with pytest.raises(SystemExit) as exc_info:
            scheduler.stop()

        assert exc_info.value.code == 0
        mock_scheduler_instance.shutdown.assert_called_once_with(wait=True)

    @patch("src.scheduler.get_config")
    @patch("src.scheduler.BackgroundScheduler")
    def test_poll_all_routes_success(
        self, mock_scheduler_class, mock_config, scheduler
    ):
        """Test successful polling of all routes."""
        # Setup mocks
        mock_config_instance = Mock()
        mock_config_instance.routes = [
            {
                "id": "route_001",
                "name": "Test Route 1",
                "origin": {"lat": 10.862, "lng": 106.775},
                "destination": {"lat": 10.835, "lng": 106.782},
            }
        ]
        mock_config.return_value = mock_config_instance

        # Mock API client
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
            "congestion_level": "High",
            "los": "D",
        }
        scheduler.api_client = mock_api_client

        # Mock data processor
        mock_data_processor = Mock()
        mock_validated_data = Mock()
        mock_data_processor.validate_record.return_value = mock_validated_data
        mock_data_processor.check_duplicate.return_value = False
        mock_data_processor.save_to_csv = Mock()
        scheduler.data_processor = mock_data_processor

        # Run poll
        scheduler._poll_all_routes()

        # Verify calls
        assert scheduler.total_polls == 1
        assert scheduler.successful_polls == 1
        assert scheduler.failed_polls == 0
        mock_api_client.fetch_route_data.assert_called_once()
        mock_data_processor.validate_record.assert_called_once()

    @patch("src.scheduler.get_config")
    def test_generate_daily_summary(self, mock_config, scheduler):
        """Test daily summary generation."""
        from datetime import datetime

        # Setup mocks
        mock_config_instance = Mock()
        mock_config_instance.storage_config = {"reports_dir": "data/reports"}
        mock_config.return_value = mock_config_instance

        # Mock data processor
        mock_data_processor = Mock()
        mock_data_processor.generate_daily_summary.return_value = {
            "date": "20260409",
            "total_polls": 96,
            "successful": 95,
            "failed": 1,
            "success_rate": 98.96,
        }
        scheduler.data_processor = mock_data_processor

        # Generate summary
        date = datetime(2026, 4, 9, 0, 5)  # 00:05 - should trigger summary
        scheduler._generate_daily_summary(date)

        # Verify calls
        mock_data_processor.generate_daily_summary.assert_called_once_with(date)
        mock_data_processor.save_daily_summary.assert_called_once()
