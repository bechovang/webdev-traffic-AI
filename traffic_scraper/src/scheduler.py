"""APScheduler orchestration for traffic scraper."""

import signal
import sys
from datetime import datetime
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from src.api_client import TrafficAPIClient, TomTomAPIError
from src.config.settings import get_config
from src.data_processor import DataProcessor, ValidationError
from src.logger import get_logger

logger = get_logger()


class TrafficScheduler:
    """Scheduler for automated traffic data collection."""

    def __init__(self):
        """Initialize the traffic scheduler."""
        self.config = get_config()
        self.scheduler: Optional[BackgroundScheduler] = None
        self.api_client: Optional[TrafficAPIClient] = None
        self.data_processor: Optional[DataProcessor] = None

        # Track polling state
        self.total_polls = 0
        self.successful_polls = 0
        self.failed_polls = 0

        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully.

        Args:
            signum: Signal number
            frame: Current stack frame
        """
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self.stop()

    def start(self):
        """Start the traffic scraper scheduler."""
        try:
            logger.info("Starting Traffic Scraper scheduler")

            # Initialize components
            self.api_client = TrafficAPIClient(api_key=self.config.tomtom_api_key)
            self.data_processor = DataProcessor(data_dir=self.config.data_dir)

            # Ensure directories exist
            self.config.ensure_directories()

            # Create scheduler
            self.scheduler = BackgroundScheduler(
                timezone="Asia/Ho_Chi_Minh",  # Vietnam timezone
                daemon=False,  # Don't run as daemon to allow graceful shutdown
            )

            # Calculate cron expression for interval
            interval_minutes = self.config.get_interval_minutes()
            collection_days = self.config.get_collection_days()

            # Schedule job to run every X minutes
            self.scheduler.add_job(
                self._poll_all_routes,
                trigger="interval",
                minutes=interval_minutes,
                id="traffic_polling",
                name="Poll all routes for traffic data",
                replace_existing=True,
            )

            # Log startup info
            logger.info(
                "Scheduler configured",
                extra={
                    "interval_minutes": interval_minutes,
                    "collection_days": collection_days,
                    "num_routes": len(self.config.routes),
                },
            )

            # Start scheduler
            self.scheduler.start()

            logger.info("Scheduler started successfully")

            # Run initial poll
            logger.info("Running initial poll...")
            self._poll_all_routes()

        except Exception as e:
            logger.error(f"Failed to start scheduler: {str(e)}", exc_info=True)
            sys.exit(1)

    def _poll_all_routes(self):
        """Poll all configured routes for traffic data."""
        logger.info("Starting polling cycle for all routes")

        timestamp = datetime.now().isoformat()

        for route in self.config.routes:
            self.total_polls += 1

            route_id = route["id"]
            route_name = route["name"]
            origin = route["origin"]
            destination = route["destination"]

            try:
                # Fetch data from API
                api_response = self.api_client.fetch_route_data(
                    route_id=route_id,
                    origin_lat=origin["lat"],
                    origin_lng=origin["lng"],
                    dest_lat=destination["lat"],
                    dest_lng=destination["lng"],
                )

                # Calculate metrics
                metrics = self.api_client.calculate_traffic_metrics(
                    api_response=api_response,
                    route_name=route_name,
                    origin_lat=origin["lat"],
                    origin_lng=origin["lng"],
                    dest_lat=destination["lat"],
                    dest_lng=destination["lng"],
                )

                # Add timestamp
                metrics["timestamp"] = timestamp

                # Validate and save
                try:
                    validated_data = self.data_processor.validate_record(metrics)

                    # Check for duplicates
                    if not self.data_processor.check_duplicate(validated_data):
                        self.data_processor.save_to_csv(validated_data)
                        self.successful_polls += 1

                except ValidationError as e:
                    logger.error(
                        f"Validation failed for {route_id}: {str(e)}",
                        extra={"route_id": route_id},
                    )
                    self.failed_polls += 1

                    # Log to dead letter queue
                    self.data_processor.save_failed_route(
                        route_id=route_id,
                        route_name=route_name,
                        error_type="ValidationError",
                        error_message=str(e),
                        retry_attempts=0,
                    )

            except TomTomAPIError as e:
                logger.error(
                    f"API error for {route_id}: {str(e)}",
                    extra={"route_id": route_id},
                )
                self.failed_polls += 1

                # Log to dead letter queue
                self.data_processor.save_failed_route(
                    route_id=route_id,
                    route_name=route_name,
                    error_type="TomTomAPIError",
                    error_message=str(e),
                    retry_attempts=3,  # tenacity retries 3 times
                )

            except Exception as e:
                logger.error(
                    f"Unexpected error for {route_id}: {str(e)}",
                    extra={"route_id": route_id},
                    exc_info=True,
                )
                self.failed_polls += 1

                # Log to dead letter queue
                self.data_processor.save_failed_route(
                    route_id=route_id,
                    route_name=route_name,
                    error_type="UnexpectedError",
                    error_message=str(e),
                    retry_attempts=0,
                )

        # Log polling cycle summary
        success_rate = (
            (self.successful_polls / self.total_polls * 100) if self.total_polls > 0 else 0
        )

        logger.info(
            "Polling cycle completed",
            extra={
                "total_polls": self.total_polls,
                "successful_polls": self.successful_polls,
                "failed_polls": self.failed_polls,
                "success_rate": round(success_rate, 2),
            },
        )

        # Generate daily summary at midnight
        now = datetime.now()
        if now.hour == 0 and now.minute < 15:
            self._generate_daily_summary(now)

    def _generate_daily_summary(self, date: datetime):
        """Generate and save daily summary report.

        Args:
            date: Date to generate summary for
        """
        logger.info(f"Generating daily summary for {date.strftime('%Y-%m-%d')}")

        try:
            summary = self.data_processor.generate_daily_summary(date)

            # Save summary to reports directory
            reports_dir = self.config.storage_config.get("reports_dir", "data/reports")
            self.data_processor.save_daily_summary(summary, reports_dir)

            logger.info(
                "Daily summary generated",
                extra={
                    "total_polls": summary["total_polls"],
                    "success_rate": summary["success_rate"],
                },
            )

        except Exception as e:
            logger.error(f"Failed to generate daily summary: {str(e)}", exc_info=True)

    def stop(self):
        """Stop the scheduler gracefully."""
        if self.scheduler and self.scheduler.running:
            logger.info("Stopping scheduler...")

            # Shutdown scheduler
            self.scheduler.shutdown(wait=True)

            # Log final statistics
            success_rate = (
                (self.successful_polls / self.total_polls * 100)
                if self.total_polls > 0
                else 0
            )

            logger.info(
                "Scheduler stopped. Final statistics:",
                extra={
                    "total_polls": self.total_polls,
                    "successful_polls": self.successful_polls,
                    "failed_polls": self.failed_polls,
                    "success_rate": round(success_rate, 2),
                },
            )

            sys.exit(0)

    def run_forever(self):
        """Run the scheduler indefinitely until interrupted."""
        try:
            logger.info("Press Ctrl+C to stop the scheduler")

            # Keep the main thread alive
            while True:
                import time

                time.sleep(1)

        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received")
            self.stop()
