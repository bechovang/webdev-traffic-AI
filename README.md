# Web Development — HCM City Traffic Intelligence

Hệ thống giám sát giao thông đô thị thông minh theo thời gian thực và dự báo ùn tắc bằng AI tại **TP. Thủ Đức, TP. Hồ Chí Minh**. Dự án tích hợp thu thập dữ liệu định kỳ từ **TomTom Routing API**, phân tích chỉ số dịch vụ (Level of Service — LOS A-F), backend streaming WebSocket và giao diện Dashboard Civic Tech tương tác.

---

## 🏛️ Cấu trúc dự án hợp nhất (Gọn gàng & Chuẩn mực)

```text
webdev-traffic-AI/
├── backend/                    # Toàn bộ mã nguồn Backend hợp nhất (FastAPI + Scraper + AI Engine)
│   ├── config/                 # Cấu hình 10 tuyến đường (routes.yaml) & nạp môi trường (settings.py)
│   ├── core/                   # Các thành phần lõi
│   │   ├── api_client.py       # TomTom Routing API client kèm retry logic (tenacity)
│   │   ├── data_processor.py   # Kiểm tra schema, chống trùng lặp, lưu CSV & Dead Letter Queue
│   │   ├── logger.py           # Structured JSON logger xoay vòng hàng ngày
│   │   └── models.py           # Pydantic schemas, Dataclasses & thuật toán phân loại LOS A-F
│   ├── services/               # Các dịch vụ nghiệp vụ
│   │   ├── ai_engine.py        # Mô hình dự báo chuỗi thời gian & sóng ùn tắc (+15m, +30m, +45m)
│   │   ├── traffic_service.py  # Điều phối dữ liệu telemetry, routes và các kịch bản mô phỏng
│   │   └── scheduler.py        # APScheduler thu thập dữ liệu định kỳ 15 phút/lần
│   ├── tests/                  # Bộ 29 unit tests (pytest) kiểm thử toàn diện
│   ├── data/                   # Dữ liệu cào CSV (scraped_data/), báo cáo (reports/), lỗi (failed_routes.csv)
│   ├── docs/                   # Tài liệu kỹ thuật chi tiết (TECH_DOCS.md)
│   ├── main.py                 # FastAPI application, REST endpoints & WebSocket server
│   ├── run.py                  # Script chạy máy chủ backend (Port 8000)
│   ├── scraper_runner.py       # Script chạy độc lập tác vụ cào dữ liệu (CLI)
│   ├── requirements.txt        # Danh sách thư viện Python
│   ├── pyproject.toml          # Cấu hình pytest
│   └── .env.example            # Mẫu biến môi trường
│
├── frontend/                   # React 18 + Vite + Tailwind CSS (Civic Tech Light Mode)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx             # Thanh điều hướng, đồng hồ thời gian thực, nút Poll Now
│   │   │   ├── KpiCards.tsx           # Thẻ KPI đô thị (vận tốc TB, số tuyến nghẽn, LOS)
│   │   │   ├── TrafficMap.tsx         # Bản đồ số Leaflet (10 tuyến TP. Thủ Đức, tô màu LOS A-F)
│   │   │   ├── AiPredictionPanel.tsx  # Phân hệ dự báo AI tương lai (+15, +30, +45 phút)
│   │   │   ├── SpeedTrendChart.tsx    # Biểu đồ chuỗi thời gian Recharts
│   │   │   ├── CorridorTable.tsx      # Bảng dữ liệu chi tiết, tìm kiếm & lọc LOS
│   │   │   └── SimulationControls.tsx # Bảng giả lập kịch bản giờ cao điểm / tai nạn cho BGK
│   │   ├── services/api.ts            # Client API kết nối Backend
│   │   ├── types.ts                   # TypeScript interfaces
│   │   └── App.tsx                    # Layout tổng thể Bento Grid
│   └── package.json
│
├── run_app.py                  # Script Python 1-click khởi chạy đồng thời Backend & Frontend
├── start_dashboard.bat         # File .bat 1-click khởi chạy trên Windows
└── README.md
```

---

## ⚡ Bắt đầu nhanh (Khởi chạy 1-Click)

### 1. Chuẩn bị môi trường

Yêu cầu: **Python 3.11+** và **Node.js 18+**.

```bash
# Cài đặt backend
.venv\Scripts\python.exe -m pip install -r backend/requirements.txt

# Cài đặt frontend
cd frontend
npm install
cd ..
```

### 2. Khởi chạy hệ thống

**Cách 1 (Khuyên dùng trên Windows)**:
Nhấp đúp chuột vào file **`start_dashboard.bat`** hoặc gõ lệnh:
```bash
start_dashboard.bat
```

**Cách 2 (Dùng Python runner)**:
```bash
python run_app.py
```

* **Giao diện Dashboard**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
* **Swagger API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **WebSocket Stream**: `ws://127.0.0.1:8000/ws/traffic`

---

## 🧪 Kiểm thử đơn vị (Unit Tests)

Bộ 29 test cases kiểm thử độc lập API client, data validation, scheduler và dead-letter queue:

```bash
cd backend
..\.venv\Scripts\python.exe -m pytest -v
```

Kết quả: **29/29 tests passed (100%)**.

---

## 📄 Giấy phép

Phát triển phục vụ cuộc thi Web Development 2026. Phát hành dưới giấy phép MIT.
