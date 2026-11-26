# Web Development — Data Traffic HCM

Dự án thu thập và phân tích dữ liệu giao thông theo thời gian thực tại khu vực **TP. Thủ Đức, TP. Hồ Chí Minh**, sử dụng **TomTom Routing API** để làm nền tảng dữ liệu cho các bài toán phân tích và dự đoán tình trạng giao thông.

## Cấu trúc dự án

```text
webdev-traffic-AI/
├── traffic_scraper/            # Ứng dụng Python thu thập dữ liệu giao thông tự động
│   ├── config/                 # Cấu hình tuyến đường (routes.yaml) & nạp env (settings.py)
│   ├── docs/                   # Tài liệu kỹ thuật chi tiết (TECH_DOCS.md)
│   ├── src/                    # Mã nguồn chính (API client, processor, scheduler, logger)
│   ├── tests/                  # Unit tests (pytest)
│   ├── pyproject.toml          # Cấu hình project & pytest
│   ├── requirements.txt        # Danh sách thư viện Python
│   └── .env.example            # Mẫu biến môi trường
├── _bmad-output/               # Tài liệu kiến trúc ban đầu (architecture.md)
├── my_plan/                    # Ghi chú nghiên cứu & ý tưởng thu thập dữ liệu
└── README.md
```

## Bắt đầu nhanh

Xem hướng dẫn cài đặt và chạy tại [traffic_scraper/README.md](traffic_scraper/README.md) và tài liệu kỹ thuật đầy đủ tại [traffic_scraper/docs/TECH_DOCS.md](traffic_scraper/docs/TECH_DOCS.md).

```bash
cd traffic_scraper
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Điền TOMTOM_API_KEY
python src/main.py
```

## Giấy phép

MIT License
