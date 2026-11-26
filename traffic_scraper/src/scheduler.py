"""APScheduler orchestration for traffic scraper."""

import signal
import sys
import time
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler

from config.settings import Config, get_config
from src.api_client import TomTomAPIError, TrafficAPIClient
from src.data_processor import DataProcessor, ValidationError
from src.logger import get_logger

logger = get_logger()
VIETNAM_TZ = ZoneInfo("Asia/Ho_Chi_Minh")


class TrafficScheduler:
    """Scheduler for automated traffic data collection."""

    def __init__(self, config: Optional[Config] = None):
        """Initialize the traffic scheduler."""
        self.config = config or get_config()
        self.scheduler: Optional[BackgroundScheduler] = None
        self.api_client: Optional[TrafficAPIClient] = None
        self.data_processor: Optional[DataProcessor] = None

        self.total_polls = 0
        self.successful_polls = 0
        self.failed_polls = 0
        self._last_summary_date: Optional[str] = None

        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame) -> None:
        """Handle shutdown signals gracefully."""
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self.stop()

    def start(self) -> None:
        """Start the traffic scraper scheduler."""
        try:
            logger.info("Starting Traffic Scraper scheduler")

            self.api_client = TrafficAPIClient(api_key=self.config.tomtom_api_key)
            failed_routes_file = self.config.storage_config.get(
                "failed_routes_file", "data/failed_routes.csv"
            )
            data_dir = str(self.config.base_dir / self.config.data_dir)
            dlq_path = str(self.config.base_dir / failed_routes_file)
            self.data_processor = DataProcessor(data_dir=data_dir, failed_routes_file=dlq_path)

            self.config.ensure_directories()

            self.scheduler = BackgroundScheduler(
                timezone="Asia/Ho_Chi_Minh",
                daemon=False,
            )

            interval_minutes = self.config.get_interval_minutes()
            collection_days = self.config.get_collection_days()
            end_date = (
                datetime.now(VIETNAM_TZ) + timedelta(days=collection_days)
                if collection_days > 0
                else None
            )

            self.scheduler.add_job(
                self._poll_all_routes,
                trigger="interval",
                minutes=interval_minutes,
                end_date=end_date,
                id="traffic_polling",
                name="Poll all routes for traffic data",
                replace_existing=True,
            )

            logger.info(
                "Scheduler configured",
                extra={
                    "interval_minutes": interval_minutes,
                    "collection_days": collection_days,
                    "num_routes": len(self.config.routes),
                },
            )

            self.scheduler.start()
            logger.info("Scheduler started successfully")

            logger.info("Running initial poll...")
            self._poll_all_routes()

        except Exception as e:
            logger.error(f"Failed to start scheduler: {str(e)}", exc_info=True)
            sys.exit(1)

    def _poll_all_routes(self) -> None:
        """Poll all configured routes for traffic data."""
        logger.info("Starting polling cycle for all routes")
        now = datetime.now(VIETNAM_TZ)
        timestamp = now.isoformat()

        for route in self.config.routes:
            self.total_polls += 1
            route_id = route["id"]
            route_name = route["name"]
            origin = route["origin"]
            destination = route["destination"]

            try:
                api_response = self.api_client.fetch_route_data(
                    route_id=route_id,
                    origin_lat=origin["lat"],
                    origin_lng=origin["lng"],
                    dest_lat=destination["lat"],
                    dest_lng=destination["lng"],
                )

                metrics = self.api_client.calculate_traffic_metrics(
                    api_response=api_response,
                    route_name=route_name,
                    origin_lat=origin["lat"],
                    origin_lng=origin["lng"],
                    dest_lat=destination["lat"],
                    dest_lng=destination["lng"],
                )
                metrics["timestamp"] = timestamp

                try:
                    validated_data = self.data_processor.validate_record(metrics)
                    if not self.data_processor.check_duplicate(validated_data):
                        self.data_processor.save_to_csv(validated_data)
                        self.successful_polls += 1
                except ValidationError as e:
                    logger.error(
                        f"Validation failed for {route_id}: {str(e)}",
                        extra={"route_id": route_id},
                    )
                    self.failed_polls += 1
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
                self.data_processor.save_failed_route(
                    route_id=route_id,
                    route_name=route_name,
                    error_type="TomTomAPIError",
                    error_message=str(e),
                    retry_attempts=3,
                )

            except Exception as e:
                logger.error(
                    f"Unexpected error for {route_id}: {str(e)}",
                    extra={"route_id": route_id},
                    exc_info=True,
                )
                self.failed_polls += 1
                self.data_processor.save_failed_route(
                    route_id=route_id,
                    route_name=route_name,
                    error_type="UnexpectedError",
                    error_message=str(e),
                    retry_attempts=0,
                )

        success_rate = (
            (self.successful_polls / self.total_polls * 100) if self.total_polls > 0 else 0.0
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

        today_str = now.strftime("%Y%m%d")
        if now.hour == 0 and now.minute < 15 and self._last_summary_date != today_str:
            self._generate_daily_summary(now)
            self._last_summary_date = today_str

    def _generate_daily_summary(self, date: datetime) -> None:
        """Generate and save daily summary report."""
        logger.info(f"Generating daily summary for {date.strftime('%Y-%m-%d')}")
        try:
            summary = self.data_processor.generate_daily_summary(date)
            reports_dir = self.config.storage_config.get("reports_dir", "data/reports")
            reports_path = str(self.config.base_dir / reports_dir)
            self.data_processor.save_daily_summary(summary, reports_path)

            logger.info(
                "Daily summary generated",
                extra={
                    "total_polls": summary["total_polls"],
                    "success_rate": summary["success_rate"],
                },
            )
        except Exception as e:
            logger.error(f"Failed to generate daily summary: {str(e)}", exc_info=True)

    def stop(self) -> None:
        """Stop the scheduler gracefully."""
        if self.scheduler and self.scheduler.running:
            logger.info("Stopping scheduler...")
            self.scheduler.shutdown(wait=True)

            if self.api_client:
                self.api_client.close()

            success_rate = (
                (self.successful_polls / self.total_polls * 100)
                if self.total_polls > 0
                else 0.0
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

    def run_forever(self) -> None:
        """Run the scheduler indefinitely until interrupted."""
        try:
            logger.info("Press Ctrl+C to stop the scheduler")
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received")
            self.stop()
