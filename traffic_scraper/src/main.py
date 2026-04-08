"""Main entry point for Traffic Scraper."""

import sys

from src.config.settings import get_config
from src.logger import get_logger, setup_logger
from src.scheduler import TrafficScheduler


def main():
    """Main entry point for the traffic scraper application."""
    # Initialize configuration
    try:
        config = get_config()
    except Exception as e:
        print(f"Configuration error: {e}")
        print("\nPlease ensure:")
        print("1. .env file exists with TOMTOM_API_KEY set")
        print("2. config/routes.yaml exists with valid route definitions")
        sys.exit(1)

    # Setup logger
    log_level = config.log_level or "INFO"
    logger = setup_logger(
        name="traffic_scraper",
        level=log_level,
        log_dir=config.logs_dir,
        format_json=True,
    )

    # Log startup
    logger.info("Traffic Scraper starting...")

    try:
        # Create and start scheduler
        scheduler = TrafficScheduler()
        scheduler.start()

        # Run forever
        scheduler.run_forever()

    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
        scheduler.stop()

    except Exception as e:
        logger.error(f"Fatal error: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
