"""Logging setup for backend and scraper."""

import json
import logging
from datetime import datetime
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

EXTRA_LOG_FIELDS = (
    "route_id",
    "current_speed",
    "free_flow_speed",
    "congestion_level",
    "congestion_ratio",
    "los",
    "error_type",
    "retry_attempts",
    "total_polls",
    "successful_polls",
    "failed_polls",
    "success_rate",
    "interval_minutes",
    "collection_days",
    "num_routes",
    "file",
)


def setup_logger(
    name: str = "traffic_backend",
    level: str = "INFO",
    log_dir: str = "logs",
    format_json: bool = True,
) -> logging.Logger:
    """Sets up structured JSON logger with daily file rotation."""
    logger = logging.getLogger(name)
    log_level = getattr(logging, level.upper(), logging.INFO)
    logger.setLevel(log_level)
    logger.handlers.clear()

    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)
    log_file = log_path / f"scraper_{datetime.now().strftime('%Y%m%d')}.log"

    file_handler = TimedRotatingFileHandler(
        log_file,
        when="midnight",
        interval=1,
        backupCount=7,
        encoding="utf-8",
    )
    file_handler.setLevel(log_level)

    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)

    if format_json:
        formatter: logging.Formatter = JSONFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        for field in EXTRA_LOG_FIELDS:
            if hasattr(record, field):
                log_data[field] = getattr(record, field)

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data, ensure_ascii=False)


def get_logger(name: str = "traffic_backend") -> logging.Logger:
    """Returns or creates logger instance."""
    return logging.getLogger(name)
