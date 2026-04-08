# Traffic Scraper

Automated traffic data collection system for Thu Duc, Ho Chi Minh City. Polls TomTom Routing API every 15 minutes for 7 days across 10 key routes.

## Features

- **10 Key Routes**: Monitors major traffic corridors in Thu Duc
- **15-Minute Polling**: Consistent data collection intervals
- **7-Day Continuous Run**: Fault-tolerant, auto-recovery system
- **TomTom API Integration**: Real-time traffic data with retry logic
- **CSV Storage**: Daily data files with validated schema
- **JSON Logging**: Structured logs for debugging and monitoring

## Tech Stack

- Python 3.11+
- `requests` - HTTP client
- `tenacity` - Retry logic with exponential backoff
- `APScheduler` - Task scheduling
- `pyyaml` - Configuration management

## Installation

```bash
# Clone repository
git clone <repository-url>
cd traffic_scraper

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Configuration

1. **Get TomTom API Key**: Register at https://developer.tomtom.com/

2. **Set up environment**:
```bash
cp .env.example .env
# Edit .env and add your TOMTOM_API_KEY
```

3. **Configure routes**: Edit `config/routes.yaml` to add/modify routes

## Usage

**Start the scraper**:
```bash
python src/main.py
```

**Run tests**:
```bash
pytest tests/
```

**Run with specific log level**:
```bash
LOG_LEVEL=DEBUG python src/main.py
```

## Project Structure

```
traffic_scraper/
├── config/
│   ├── routes.yaml      # Route definitions
│   └── settings.py      # Config loader
├── src/
│   ├── main.py          # Entry point
│   ├── api_client.py    # TomTom API client
│   ├── data_processor.py # Data validation & storage
│   ├── scheduler.py     # APScheduler orchestration
│   ├── models.py        # Data models
│   └── logger.py        # Logging setup
├── tests/               # Unit tests
├── data/
│   ├── scraped_data/    # Daily CSV files
│   └── reports/         # Summary reports
└── logs/                # Log files
```

## Data Format

**CSV Schema**:
- `timestamp` - ISO8601 with timezone
- `route_id` - Route identifier
- `route_name` - Human-readable name
- `origin_lat`, `origin_lng` - Start coordinates
- `dest_lat`, `dest_lng` - End coordinates
- `current_speed` - Current speed (km/h)
- `free_flow_speed` - Free flow speed (km/h)
- `travel_time_seconds` - Travel time
- `congestion_level` - A-F LOS classification
- `los` - Level of Service

## License

MIT License
