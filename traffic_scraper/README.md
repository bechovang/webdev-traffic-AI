# Traffic Scraper

Hệ thống thu thập dữ liệu giao thông tự động cho khu vực **TP. Thủ Đức, TP. Hồ Chí Minh**, gọi **TomTom Routing API** định kỳ mỗi 15 phút trong 7 ngày trên 10 tuyến đường trọng điểm.

> Xem tài liệu kỹ thuật chi tiết tại [docs/TECH_DOCS.md](docs/TECH_DOCS.md).

## Tính năng chính

- **10 tuyến đường trọng điểm**: Giám sát các trục đường chính tại Thủ Đức và khu vực lân cận.
- **Polling định kỳ (15 phút)**: Thu thập dữ liệu chuỗi thời gian nhất quán qua `APScheduler`.
- **Giới hạn chu kỳ thu thập**: Hỗ trợ tự động dừng sau số ngày cấu hình (`COLLECTION_DAYS`, mặc định 7 ngày).
- **TomTom API + Retry**: Tự động thử lại với exponential backoff (`tenacity`) khi gặp lỗi mạng/timeout.
- **Lưu trữ CSV & Dead Letter Queue**: Lưu dữ liệu hợp lệ theo ngày và ghi lại các tuyến lỗi để theo dõi.
- **Structured JSON Logging**: Ghi log JSON xoay vòng theo ngày, lưu tối đa 7 ngày.

## Công nghệ sử dụng

- Python 3.11+
- `requests` — HTTP client
- `tenacity` — Retry với exponential backoff
- `APScheduler` — Lập lịch tác vụ nền
- `pyyaml` & `python-dotenv` — Quản lý cấu hình & biến môi trường
- `pytest` & `pytest-mock` — Kiểm thử đơn vị

## Cài đặt

```bash
cd traffic_scraper

# Tạo virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/macOS

# Cài đặt dependencies
pip install -r requirements.txt
```

## Cấu hình

1. Đăng ký API key miễn phí tại [TomTom Developer Portal](https://developer.tomtom.com/).
2. Tạo file `.env` từ mẫu:
   ```bash
   cp .env.example .env
   ```
   Cập nhật `TOMTOM_API_KEY` trong `.env`.
3. Tuỳ chỉnh danh sách tuyến đường hoặc chu kỳ trong `config/routes.yaml`.

## Sử dụng

**Khởi chạy scraper:**
```bash
python src/main.py
```

**Chạy unit tests:**
```bash
pytest
```

**Chạy với mức log DEBUG:**
```bash
LOG_LEVEL=DEBUG python src/main.py
```

## Cấu trúc thư mục

```text
traffic_scraper/
├── config/
│   ├── routes.yaml         # Định nghĩa 10 tuyến đường & tham số scraper
│   └── settings.py         # Config loader & validator
├── docs/
│   └── TECH_DOCS.md        # Tài liệu kỹ thuật chi tiết
├── src/
│   ├── main.py             # Entry point
│   ├── api_client.py       # TomTom API client & tính toán chỉ số
│   ├── data_processor.py   # Validate, deduplicate, ghi CSV & DLQ
│   ├── scheduler.py        # APScheduler orchestration
│   ├── models.py           # Data models & công thức LOS (A–F)
│   └── logger.py           # Structured JSON logger
├── tests/                  # Unit tests
├── pyproject.toml          # Cấu hình project & pytest
└── requirements.txt
```

## Giấy phép

MIT License
