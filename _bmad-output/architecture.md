---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: []
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-04-09'
project_name: 'traffic-scraper'
user_name: 'Admin'
date: '2026-04-08'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

Hệ thống thu thập dữ liệu traffic real-time từ các tuyến đường huyết mạch tại TP. Thủ Đức, TP.HCM:

| Requirement | Description | Architectural Implication |
|-------------|-------------|---------------------------|
| FR-1 | Polling traffic data cho 10 routes định nghĩa sẵn | Cần flexible route configuration system |
| FR-2 | Polling interval: 15 phút | Cần reliable scheduler/cron mechanism |
| FR-3 | Collection duration: 7 ngày liên tục | Cần fault-tolerance và auto-recovery |
| FR-4 | Gọi TomTom Traffic API để lấy traffic flow | Cần API client với retry logic |
| FR-5 | Lưu trữ time-series data (timestamp, route, speed, congestion) | Cần time-series database hoặc structured storage |
| FR-6 | Validate data trước khi lưu | Cần data validation layer |
| FR-7 | Log tất cả activities để debug | Cần structured logging system |

**Non-Functional Requirements:**

| NFR | Priority | Description | Architectural Impact |
|-----|----------|-------------|----------------------|
| NFR-1 | Critical | Reliability - Run 7 ngày non-stop | Robust error handling, auto-restart |
| NFR-2 | Critical | Cost - $0 (TomTom free tier) | Rate limiting, call optimization |
| NFR-3 | High | Data Quality - Complete, accurate | Validation, deduplication |
| NFR-4 | High | Maintainability - Easy to debug | Clean architecture, good logging |
| NFR-5 | Medium | Scalability - Add routes later | Modular design, config-driven |

**Scale & Complexity:**

- **Primary domain**: Backend Data Engineering / API Integration
- **Complexity level**: Low-Medium
- **Estimated architectural components**: 5 main modules
  - API Client Layer
  - Scheduler/Orchestrator
  - Data Processor/Validator
  - Storage Layer
  - Monitoring/Logging

**Data Volume Estimates:**
- 10 routes × 96 data points/day × 7 days = 6,720 records
- API calls: 6,720 (within TomTom free tier of 17,500/7 days)
- Storage: ~1-2 MB (CSV/JSON format)

### Technical Constraints & Dependencies

**External Dependencies:**
- TomTom Traffic API (Free Tier: 2,500 calls/day)
- Internet connection stable
- Python 3.8+ runtime

**Constraints:**
| Constraint | Limitation | Mitigation Strategy |
|------------|------------|---------------------|
| API Rate Limit | 2,500 calls/day | Current usage: ~960/day (safe margin) |
| Network | Potential failures | Retry with exponential backoff |
| Local Machine | Must run continuously | Graceful shutdown/resume |
| API Key | Single key rotation | Config-based, easy to update |

### Cross-Cutting Concerns Identified

| Concern | Impact | Mitigation |
|---------|--------|------------|
| **Error Handling** | API failures, network issues | Retry logic, dead letter queue |
| **Logging** | Debugging failed scrapes | Structured logs with levels |
| **Configuration** | Routes, API keys, intervals | External config file (.env/.yaml) |
| **Data Validation** | Bad data from API | Schema validation, outlier detection |
| **Monitoring** | Track scraper health | Health checks, status reporting |
| **Idempotency** | Re-run without duplicates | Timestamp-based deduplication |

---

## Starter Template Evaluation

### Primary Technology Domain

Python Backend Data Engineering - Simple API scraping with scheduled execution

### Selected Approach: Custom Python Project with Standard Libraries

**Rationale:**
This is a focused, straightforward scraping task that doesn't require complex frameworks. We'll use standard Python libraries with proven reliability for long-running scheduled tasks.

### Technology Stack

**Language & Runtime:**
- Python 3.11+ (stable, modern features, excellent library support)

**Core Libraries:**

| Component | Library | Purpose |
|-----------|---------|---------|
| HTTP Client | `requests` | TomTom API calls |
| Retry Logic | `tenacity` | Exponential backoff, retry on failure |
| Scheduling | `APScheduler` | Reliable 15-minute interval polling |
| Configuration | `pyyaml`, `python-dotenv` | Routes config, API keys |
| Data Handling | `pandas` (optional) | CSV processing, validation |
| Logging | `logging` (built-in) | Structured logs with file rotation |

**Storage Strategy:**
- Phase 1: CSV files (simple, portable, sufficient for 6,720 records)
- Phase 2: Upgrade to SQLite if querying/filtering needed

### Project Structure

```
traffic_scraper/
├── config/
│   ├── routes.yaml          # Route definitions (origin, destination, metadata)
│   └── settings.py          # App configuration (API keys, intervals)
├── src/
│   ├── api_client.py        # TomTom API client with retry logic
│   ├── scheduler.py         # APScheduler orchestration
│   ├── data_processor.py    # Data validation, transformation, storage
│   ├── models.py            # Data models/schemas
│   └── main.py              # Entry point
├── data/
│   ├── scraped_data/        # Output CSV files
│   └── reports/             # Daily summary reports
├── logs/
│   └── scraper.log          # Rotated logs
├── tests/
│   └── test_*.py
├── .env                     # API keys (gitignored)
├── .env.example
├── requirements.txt
└── README.md
```

### Initialization Commands

```bash
# Create project directory
mkdir traffic_scraper && cd traffic_scraper

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install python-dateutil requests tenacity APScheduler pyyaml python-dotenv

# Create project structure
mkdir -p config src data/scraped_data data/reports logs tests
touch src/__init__.py config/__init__.py
```

### Architectural Decisions Provided by Starter

**Modular Design:**
- Each module has single responsibility
- Easy to test in isolation
- Simple to swap components (e.g., change storage from CSV to SQLite)

**Error Handling Strategy:**
- `tenacity` for automatic retry with exponential backoff
- Dead letter queue for failed API calls (log for manual retry)
- Graceful degradation (continue if one route fails)

**Configuration Management:**
- `.env` for sensitive data (API keys)
- `routes.yaml` for route definitions (easy to add/modify)
- `settings.py` for app configuration

**Idempotency:**
- Timestamp-based deduplication
- Safe to re-run without duplicates

**Monitoring:**
- Structured logging (JSON format for easy parsing)
- Daily summary reports
- Health check endpoint (optional)

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data model schema and CSV format
- Error handling and retry strategy
- TomTom API integration approach

**Important Decisions (Shape Architecture):**
- Logging format and rotation
- Configuration structure
- Daily summary reporting

**Deferred Decisions (Post-MVP):**
- SQLite migration (if CSV becomes limiting)
- Dashboard UI for monitoring
- Multi-API provider support

### Data Architecture

**Data Model Schema:**

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| timestamp | ISO8601 | When data was collected | Required, unique |
| route_id | string | Route identifier | Required, exists in config |
| route_name | string | Human-readable name | Required |
| origin_lat | float | Start latitude | -90 to 90 |
| origin_lng | float | Start longitude | -180 to 180 |
| dest_lat | float | End latitude | -90 to 90 |
| dest_lng | float | End longitude | -180 to 180 |
| current_speed | float | Current speed (km/h) | 0-200 |
| free_flow_speed | float | Free flow speed (km/h) | 0-200 |
| travel_time_seconds | int | Travel time in seconds | >0 |
| congestion_level | enum | A-F LOS classification | A,B,C,D,E,F |
| los | string | Level of Service | A-F |

**File Organization:**
- One CSV file per day: `traffic_data_YYYYMMDD.csv`
- Failed routes log: `failed_routes.csv`
- Daily summary: `summary_YYYYMMDD.csv`

### Error Handling & Resilience

**Retry Configuration:**

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Max attempts | 3 | Balance persistence vs speed |
| Wait strategy | Exponential (1s, 2s, 4s) | Standard for API retries |
| Retry on | 5xx, 429, network errors | Recoverable failures |
| Dead letter queue | `failed_routes.csv` | Manual inspection possible |

**Graceful Degradation:**
- Single route failure → Continue with remaining routes
- All routes failure → Log CRITICAL, wait for next interval
- API quota exceeded → Stop polling, send alert

### Logging & Monitoring

**Log Format:** JSON structured logging

**Log Levels & Use Cases:**
- DEBUG: Full API request/response
- INFO: Successful data collection
- WARNING: First retry attempt
- ERROR: Failed after all retries
- CRITICAL: System-level issues

**Rotation:** Daily files, retain 7 days

**Daily Summary Report Fields:**
```csv
date,total_polls,successful,failed,success_rate,avg_congestion_level
```

### Configuration Management

**routes.yaml Structure:**
```yaml
routes:
  - id: route_001
    name: "Route Name"
    origin: {lat: 0.0, lng: 0.0}
    destination: {lat: 0.0, lng: 0.0}
    metadata: {...}

scraper:
  interval_minutes: 15
  collection_days: 7
  api_provider: tomtom
```

**Environment Variables:**
```
TOMTOM_API_KEY (required)
LOG_LEVEL (default: INFO)
DATA_DIR (default: data/scraped_data)
LOGS_DIR (default: logs)
```

### API Integration

**TomTom Routing API:**
- Endpoint: `https://api.tomtom.com/routing/1/calculateRoute/{orig}:{dest}/json`
- Key parameter: `traffic=true` to get real-time data
- Key response field: `routes[0].summary.trafficTimeInSeconds`
- Rate limit: 2,500 calls/day (free tier)

**Response Parsing:**
```python
current_speed = (distance_meters / traffic_time_seconds) * 3.6  # km/h
free_flow_speed = (distance_meters / travel_time_seconds) * 3.6  # km/h
congestion_ratio = current_speed / free_flow_speed
los = calculate_los(congestion_ratio)  # A-F based on ratio
```

### Testing Strategy

**Unit Tests:**
- API client with mocked responses
- Data processor validation logic
- Scheduler interval calculations

**Integration:**
- Single real API call test (manual trigger)

**Coverage Goal:** >80% for core logic

### Decision Impact Analysis

**Implementation Sequence:**
1. Configuration setup (routes.yaml, .env)
2. Data model & validation
3. API client with retry
4. Scheduler setup
5. Logging & monitoring
6. Daily summary generation

**Cross-Component Dependencies:**
- API client → Data processor (raw data → validated records)
- Data processor → Storage (validated records → CSV files)
- All components → Logger (structured JSON output)

---

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
8 areas where AI agents could make different choices

### Naming Patterns

**Python Code Naming (PEP 8 compliant):**

| Type | Convention | Example | Rationale |
|------|------------|---------|-----------|
| Functions | `snake_case` | `get_traffic_data()` | Python standard |
| Variables | `snake_case` | `route_id`, `current_speed` | Python standard |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRIES`, `API_TIMEOUT` | Python standard |
| Classes | `PascalCase` | `TrafficAPIClient`, `DataProcessor` | Python standard |
| Files | `snake_case.py` | `api_client.py`, `data_processor.py` | Python standard |
| Directories | `snake_case` | `config/`, `src/`, `logs/` | Consistency |

**CSV Column Naming:**
- Use `snake_case`: `route_id`, `current_speed`, `travel_time_seconds`
- Consistent with Python variable names (direct mapping)

**JSON Log Field Naming:**
- Use `snake_case`: `timestamp`, `route_id`, `congestion_level`
- Consistent with CSV for easy parsing

### Structure Patterns

**Project Organization:**

```
traffic_scraper/
├── config/              # Configuration files
│   ├── routes.yaml      # Route definitions
│   └── settings.py      # Config loader
├── src/                 # Source code (all .py files)
│   ├── __init__.py
│   ├── api_client.py    # API client with retry
│   ├── data_processor.py # Validation & storage
│   ├── scheduler.py     # APScheduler orchestration
│   ├── models.py        # Data classes/schemas
│   ├── logger.py        # Logging setup
│   └── main.py          # Entry point
├── tests/               # All tests in one directory
│   ├── __init__.py
│   ├── test_api_client.py
│   ├── test_data_processor.py
│   └── test_scheduler.py
├── data/                # Data output
│   ├── scraped_data/    # Daily CSV files
│   └── reports/         # Summary reports
├── logs/                # Log files
├── .env                 # Environment variables (gitignored)
├── .env.example         # Template
└── requirements.txt     # Dependencies
```

**Import Order (per PEP 8):**
1. Standard library
2. Third-party
3. Local application

```python
# Correct
import os
import logging
from datetime import datetime

import requests
from tenacity import retry, stop_after_attempt, wait_exponential

from config.settings import get_config
from src.models import TrafficData
```

### Format Patterns

**Date/Time Format:**
- **In CSV:** ISO8601 with timezone: `2026-04-09T10:15:00+07:00`
- **In logs:** ISO8601 with timezone
- **In filenames:** `YYYYMMDD` format: `traffic_data_20260409.csv`

**CSV Format:**
- Header row required
- UTF-8 encoding
- Unix line endings (`\n`)
- No quoting unless necessary
- Comma delimiter

**JSON Log Format:**
```json
{
  "timestamp": "2026-04-09T10:15:00+07:00",
  "level": "INFO",
  "route_id": "route_001",
  "message": "Successfully fetched traffic data",
  "current_speed": 35.2,
  "congestion_level": "E"
}
```

**Error Response Format (internal):**
```python
{
  "success": False,
  "error_type": "APIConnectionError",
  "message": "Failed to connect to TomTom API",
  "route_id": "route_001",
  "retry_attempt": 2,
  "timestamp": "2026-04-09T10:15:05+07:00"
}
```

### Communication Patterns

**Logging Strategy:**
- Log BEFORE API call (DEBUG level, include params)
- Log AFTER successful response (INFO level, include key metrics)
- Log RETRY attempts (WARNING level)
- Log FAILURE (ERROR level, include full error)
- Log CRITICAL issues (CRITICAL level, system-wide)

**Event/Message Naming (for future expansion):**
- Use past tense: `data_fetched`, `route_failed`, `quota_exceeded`
- Namespace with module: `api_client.data_fetched`, `scheduler.polling_started`

### Process Patterns

**Error Handling Pattern:**

```python
# ALWAYS use tenacity decorator for API calls
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    retry=retry_if_exception_type(requests.exceptions.RequestException)
)
def call_api_with_retry():
    # API call here
    pass

# ALWAYS log to dead letter queue on final failure
try:
    result = call_api_with_retry()
except Exception as e:
    log_to_dead_letter_queue(route_id, str(e))
    raise
```

**Validation Pattern:**
- Validate IMMEDIATELY after receiving API response
- Raise `ValidationError` with detailed message
- Don't store invalid data

**Configuration Loading Pattern:**
1. Load `.env` first (API keys, secrets)
2. Load `routes.yaml` second (route definitions)
3. Validate all required config exists
4. Fail fast if config is invalid

### Enforcement Guidelines

**All AI Agents MUST:**

1. **Follow PEP 8** for all Python code
2. **Use `snake_case`** for all variables, functions, files
3. **Use `PascalCase`** for all classes
4. **Log in JSON format** with consistent field names
5. **Validate data** before storage
6. **Use `tenacity` decorators** for all API calls
7. **Handle exceptions** with specific exception types
8. **Write docstrings** for all public functions

**Pattern Enforcement:**

- Run `flake8` for PEP 8 compliance
- Run `pylint` for code quality
- Run `mypy` for type checking (optional but recommended)

### Pattern Examples

**Good Examples:**

```python
# ✅ Correct function naming and structure
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=4)
)
def fetch_traffic_data(route_id: str, origin: dict, destination: dict) -> dict:
    """
    Fetch traffic data from TomTom API.
    
    Args:
        route_id: Unique route identifier
        origin: dict with 'lat' and 'lng' keys
        destination: dict with 'lat' and 'lng' keys
    
    Returns:
        dict with traffic metrics
    
    Raises:
        APIConnectionError: If API call fails after retries
    """
    logger.info("Fetching traffic data", extra={"route_id": route_id})
    # Implementation...
```

**Anti-Patterns:**

```python
# ❌ DON'T: Mix naming conventions
def getTrafficData(routeId):  # Inconsistent naming
    pass

# ❌ DON'T: Skip validation
def save_to_csv(data):
    writer.writerow(data)  # No validation!

# ❌ DON'T: Manual retry instead of tenacity
def fetch_with_manual_retry():
    for i in range(3):
        try:
            return api_call()
        except:
            time.sleep(i)  # Should use tenacity
```

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
traffic_scraper/
├── README.md                          # Project documentation
├── requirements.txt                   # Python dependencies
├── .env                               # API keys (gitignored)
├── .env.example                       # Template for .env
├── .gitignore                         # Git ignore rules
├── LICENSE                            # MIT License
│
├── config/                            # Configuration files
│   ├── __init__.py
│   ├── routes.yaml                    # Route definitions (10 routes)
│   └── settings.py                    # Config loader & validator
│
├── src/                               # Source code
│   ├── __init__.py
│   ├── main.py                        # Entry point
│   │
│   ├── api_client.py                  # TomTom API client with retry
│   │   # Functions: fetch_traffic_data(), calculate_los()
│   │
│   ├── data_processor.py              # Data validation & storage
│   │   # Functions: validate_record(), save_to_csv(), generate_summary()
│   │
│   ├── scheduler.py                   # APScheduler orchestration
│   │   # Functions: start_scheduler(), setup_jobs(), graceful_shutdown()
│   │
│   ├── models.py                      # Data models/schemas
│   │   # Classes: TrafficData, RouteConfig, APIResponse
│   │
│   └── logger.py                      # Logging setup
│       # Functions: setup_logger(), get_logger()
│
├── tests/                             # All tests
│   ├── __init__.py
│   ├── conftest.py                    # Pytest fixtures
│   ├── test_api_client.py             # API client tests (mocked)
│   ├── test_data_processor.py         # Validation tests
│   ├── test_scheduler.py              # Scheduler tests
│   └── test_integration.py            # Real API call test (manual)
│
├── data/                              # Data output
│   ├── scraped_data/                  # Daily CSV files
│   │   ├── traffic_data_20260409.csv
│   │   ├── traffic_data_20260410.csv
│   │   └── ...
│   │
│   ├── reports/                       # Daily summary reports
│   │   ├── summary_20260409.csv
│   │   └── ...
│   │
│   └── failed_routes.csv              # Dead letter queue
│
└── logs/                              # Log files
    ├── scraper_20260409.log           # Daily log files
    ├── scraper_20260410.log
    └── ...
```

### Architectural Boundaries

**API Boundaries:**
- **External**: TomTom Routing API (`https://api.tomtom.com/routing/1/...`)
- **Internal Python API**: Functions in `api_client.py` expose clean interface to rest of system
- **No public API**: This is a data collection tool, not a service

**Component Boundaries:**
- `api_client.py` → Only communicates with TomTom API, returns validated `TrafficData` objects
- `data_processor.py` → Only receives `TrafficData` objects, handles CSV writing
- `scheduler.py` → Orchestrates polling, calls `api_client` → `data_processor` pipeline
- `logger.py` → Shared utility, no side effects except logging

**Service Boundaries:**
- Single-purpose service: Poll traffic data and store it
- No inter-service communication (monolithic architecture)
- Each module has single responsibility

**Data Boundaries:**
- **Input**: API responses from TomTom (JSON)
- **Internal**: `TrafficData` Python objects (typed)
- **Output**: CSV files with validated schema
- **Dead Letter**: `failed_routes.csv` for manual inspection

### Requirements to Structure Mapping

**Feature Mapping:**

| Functional Requirement | Primary Module | Secondary Modules |
|------------------------|----------------|-------------------|
| FR-1: Poll 10 routes | `scheduler.py` | `config/routes.yaml` |
| FR-2: 15-minute intervals | `scheduler.py` | APScheduler |
| FR-3: 7-day continuous run | `scheduler.py` | `logger.py` |
| FR-4: Call TomTom API | `api_client.py` | `tenacity` retry |
| FR-5: Store time-series data | `data_processor.py` | CSV files |
| FR-6: Validate data | `data_processor.py` | `models.py` |
| FR-7: Log activities | `logger.py` | All modules |

**Cross-Cutting Concerns:**

| Concern | Implementation Location |
|---------|------------------------|
| Logging | `logger.py` + structured JSON in all modules |
| Error Handling | `tenacity` decorators in `api_client.py` |
| Configuration | `.env` + `config/routes.yaml` + `config/settings.py` |
| Data Validation | `data_processor.py` + `models.py` schemas |
| Retry Logic | `tenacity` decorators in `api_client.py` |

### Integration Points

**Internal Communication:**

```python
# Data flow through the system:
main.py
  └─> scheduler.start_scheduler()
       └─> job triggered every 15 minutes
            └─> for route in routes:
                 └─> api_client.fetch_traffic_data(route)
                      ├─> logger.info("Fetching...")
                      ├─> requests.get(url)
                      └─> return TrafficData object
                           └─> data_processor.validate_and_save(data)
                                ├─> logger.info("Validating...")
                                ├─> validate_record(data)
                                ├─> save_to_csv(data)
                                └─> logger.info("Saved")
```

**External Integrations:**

| Integration | Module | Endpoint | Purpose |
|-------------|--------|----------|---------|
| TomTom API | `api_client.py` | `https://api.tomtom.com/routing/1/calculateRoute/` | Get traffic data |

**Data Flow:**

```
TomTom API (JSON)
       ↓
api_client.fetch_traffic_data()
       ↓
TrafficData object (validated)
       ↓
data_processor.validate_and_save()
       ↓
CSV file (data/scraped_data/traffic_data_YYYYMMDD.csv)
       ↓
Daily summary CSV (data/reports/summary_YYYYMMDD.csv)
```

### File Organization Patterns

**Configuration Files:**
- `.env` - Secrets (API keys), never commit to git
- `.env.example` - Template for required environment variables
- `config/routes.yaml` - Route definitions, easy to modify
- `config/settings.py` - Config loader with validation

**Source Organization:**
- Each module = single responsibility
- `src/` contains all Python code (no scripts at root)
- `tests/` mirrors `src/` structure where applicable

**Test Organization:**
- All tests in `tests/` directory
- `conftest.py` for shared pytest fixtures
- `test_*.py` naming convention
- `test_integration.py` for real API tests (manual trigger only)

**Asset Organization:**
- `data/scraped_data/` - Primary data output
- `data/reports/` - Derived summary reports
- `logs/` - Rotated log files

### Development Workflow Integration

**Development Server Structure:**
```bash
# Run the scraper
python src/main.py

# Run tests
pytest tests/

# Run with specific log level
LOG_LEVEL=DEBUG python src/main.py
```

**Build Process Structure:**
- No build process required (Python scripts run directly)
- `requirements.txt` for dependency installation
- Virtual environment isolation

**Deployment Structure:**
- Local deployment: Run `python src/main.py` directly
- Future cloud deployment: Dockerize (add `Dockerfile` and `docker-compose.yml`)

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices work together without conflicts:
- Python 3.11 compatible with all selected libraries
- `tenacity` retry pattern aligns with error handling strategy
- APScheduler supports 15-minute polling requirement
- CSV storage compatible with pandas data processing
- JSON logging format works with structured logging requirement

**Pattern Consistency:**
Implementation patterns fully support architectural decisions:
- PEP 8 naming consistent with Python technology choice
- Modular design aligned with project structure
- Retry pattern (tenacity) supports reliability NFR
- JSON logging supports monitoring and debugging NFRs

**Structure Alignment:**
Project structure enables all architectural decisions:
- Each module maps to specific functional requirements
- Component boundaries prevent coupling
- Data flow (API → validation → storage) is clear
- Integration points properly structured

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**

All 7 functional requirements fully architecturally supported:
- ✅ FR-1: Route configuration system (config/routes.yaml)
- ✅ FR-2: Scheduler with 15-minute intervals (APScheduler)
- ✅ FR-3: 7-day continuous run (error handling + retry + logging)
- ✅ FR-4: TomTom API client (api_client.py with tenacity)
- ✅ FR-5: Time-series storage (CSV daily files)
- ✅ FR-6: Data validation (models.py + data_processor.py)
- ✅ FR-7: Activity logging (JSON structured logging)

**Non-Functional Requirements Coverage:**

All NFRs addressed architecturally:
- ✅ NFR-1: Reliability - Retry logic + graceful degradation
- ✅ NFR-2: Cost - TomTom free tier (2,500/day, usage: 960/day)
- ✅ NFR-3: Data Quality - Validation + deduplication
- ✅ NFR-4: Maintainability - Modular design + PEP 8 + logging
- ✅ NFR-5: Scalability - Config-driven, easy to add routes

### Implementation Readiness Validation ✅

**Decision Completeness:**
All critical decisions documented with specific choices:
- Python 3.11+ specified
- All library choices documented (requests, tenacity, APScheduler, etc.)
- CSV format specified with schema
- Retry parameters defined (3 attempts, exponential backoff)
- Log format specified (JSON structured)

**Structure Completeness:**
Project structure is complete and implementation-ready:
- All 7 Python source files specified with purpose
- Test structure defined (5 test files)
- Configuration files specified (.env, routes.yaml)
- Data and logs directories organized

**Pattern Completeness:**
All potential conflict points addressed:
- Python naming conventions (PEP 8 compliant)
- CSV column naming (snake_case)
- JSON log field naming (snake_case)
- Import order specified
- Error handling pattern with tenacity decorators

### Gap Analysis Results

**Critical Gaps:** None

**Important Gaps:** None

**Nice-to-Have Gaps (Post-MVP):**
- Docker configuration for cloud deployment
- CI/CD pipeline (GitHub Actions for automated testing)
- Monitoring dashboard for real-time visibility
- SQLite migration path if CSV becomes limiting

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (Low-Medium, 6,720 records)
- [x] Technical constraints identified (TomTom API limits)
- [x] Cross-cutting concerns mapped (logging, error handling, config)

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified (Python 3.11, requests, tenacity, APScheduler)
- [x] Integration patterns defined (API → validation → storage)
- [x] Performance considerations addressed (retry logic, graceful degradation)

**✅ Implementation Patterns**
- [x] Naming conventions established (PEP 8, snake_case)
- [x] Structure patterns defined (modular, single responsibility)
- [x] Communication patterns specified (JSON logging, CSV data)
- [x] Process patterns documented (retry, validation, config loading)

**✅ Project Structure**
- [x] Complete directory structure defined (7 source files, 5 test files)
- [x] Component boundaries established (API, data processor, scheduler)
- [x] Integration points mapped (data flow documented)
- [x] Requirements to structure mapping complete (all 7 FRs mapped)

### Architecture Readiness Assessment

**Overall Status:** ✅ **READY FOR IMPLEMENTATION**

**Confidence Level:** HIGH - All validation checks passed, no critical gaps identified

**Key Strengths:**
1. Simple, focused architecture for a well-defined problem
2. Technology stack proven and reliable (Python standard libraries)
3. Error handling and retry logic comprehensive
4. Modular design enables easy testing and maintenance
5. Cost-effective (stays within TomTom free tier)
6. Config-driven for easy route additions

**Areas for Future Enhancement:**
1. Docker containerization for deployment flexibility
2. CI/CD pipeline for automated testing
3. Monitoring dashboard for operational visibility
4. SQLite migration when data volume grows
5. Multi-API provider support for redundancy

### Implementation Handoff

**AI Agent Guidelines:**
- Follow PEP 8 naming conventions exactly (snake_case for functions/variables)
- Use tenacity decorators for all API calls (3 attempts, exponential backoff)
- Log in JSON format with consistent field names (timestamp, level, route_id, message)
- Validate data before storage (check coordinates, speed ranges, required fields)
- Respect module boundaries (api_client only calls API, data_processor only handles storage)

**First Implementation Priority:**

```bash
# 1. Create project structure
mkdir -p traffic_scraper/{config,src,tests,data/{scraped_data,reports},logs}

# 2. Create virtual environment and install dependencies
python3.11 -m venv venv
source venv/bin/activate
pip install requests tenacity APScheduler pyyaml python-dotenv pytest

# 3. Create configuration files (.env, routes.yaml)

# 4. Implement core modules in order:
#    a. models.py (data models)
#    b. logger.py (logging setup)
#    c. api_client.py (TomTom API client with retry)
#    d. data_processor.py (validation and CSV storage)
#    e. scheduler.py (APScheduler orchestration)
#    f. main.py (entry point)

# 5. Write tests for each module

# 6. Run integration test with real API call

# 7. Start 7-day data collection
python src/main.py
```

---

---

## 🎉 Architecture Workflow Complete

**Status:** ✅ READY FOR IMPLEMENTATION

**Completed:** 2026-04-09

**Workflow Steps Completed:** 8/8

---

### 📝 Architecture Document Summary

This architecture document provides a complete, validated blueprint for implementing the Traffic Scraper system. All decisions have been collaboratively made and documented to ensure consistent implementation by AI agents or developers.

### 🚀 Next Steps

1. **Review the Architecture Document** - Located at `_bmad-output/architecture.md`

2. **Initialize Project Structure:**
   ```bash
   mkdir -p traffic_scraper/{config,src,tests,data/{scraped_data,reports},logs}
   cd traffic_scraper
   python3.11 -m venv venv
   source venv/bin/activate
   pip install requests tenacity APScheduler pyyaml python-dotenv pytest
   ```

3. **Create Configuration Files:**
   - `.env` with TomTom API key
   - `config/routes.yaml` with 10 route definitions

4. **Implement Core Modules** (in order):
   - `src/models.py` - Data models/schemas
   - `src/logger.py` - Logging setup
   - `src/api_client.py` - TomTom API client with retry
   - `src/data_processor.py` - Validation and CSV storage
   - `src/scheduler.py` - APScheduler orchestration
   - `src/main.py` - Entry point

5. **Write Tests:** Create unit tests for each module

6. **Start 7-Day Data Collection:** `python src/main.py`

### 📚 Reference

For questions about implementation, refer to:
- **Section:** Project Context Analysis → For requirements understanding
- **Section:** Core Architectural Decisions → For technical choices
- **Section:** Implementation Patterns → For coding standards
- **Section:** Project Structure → For file organization

---
