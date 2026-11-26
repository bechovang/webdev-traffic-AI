"""Standalone CLI entry point for running the traffic scraper background job."""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.config.settings import get_config
from backend.core.logger import setup_logger
from backend.services.scheduler import TrafficScheduler


def main() -> None:
    config = get_config()
    logger = setup_logger(
        name="traffic_scraper",
        level=config.log_level or "INFO",
        log_dir=str(config.base_dir / config.logs_dir),
        format_json=True,
    )
    logger.info("Traffic Scraper standalone runner starting...")

    scheduler = TrafficScheduler(config=config)
    try:
        scheduler.start()
        scheduler.run_forever()
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
        scheduler.stop()
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
