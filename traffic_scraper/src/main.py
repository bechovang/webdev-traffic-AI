"""Main entry point for Traffic Scraper."""

import sys
from pathlib import Path

# Ensure project root (traffic_scraper/) is on sys.path when run as `python src/main.py`
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from config.settings import get_config  # noqa: E402
from src.logger import setup_logger  # noqa: E402
from src.scheduler import TrafficScheduler  # noqa: E402


def main() -> None:
    """Main entry point for the traffic scraper application."""
    try:
        config = get_config()
    except Exception as e:
        print(f"Configuration error: {e}")
        print("\nPlease ensure:")
        print("1. .env file exists with TOMTOM_API_KEY set")
        print("2. config/routes.yaml exists with valid route definitions")
        sys.exit(1)

    logger = setup_logger(
        name="traffic_scraper",
        level=config.log_level or "INFO",
        log_dir=str(config.base_dir / config.logs_dir),
        format_json=True,
    )
    logger.info("Traffic Scraper starting...")

    scheduler = TrafficScheduler(config=config)
    try:
        scheduler.start()
        scheduler.run_forever()
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
        scheduler.stop()
    except SystemExit:
        raise
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
