# Web Development — HCM City Traffic Intelligence

Hệ thống giám sát giao thông đô thị thông minh theo thời gian thực và dự báo ùn tắc bằng AI tại **TP. Thủ Đức, TP. Hồ Chí Minh**. Dự án tích hợp thu thập dữ liệu tự động từ **TomTom Routing API**, phân tích chỉ số dịch vụ (Level of Service — LOS A-F), backend streaming WebSocket và giao diện Dashboard Civic Tech tương tác.

---

## 🏛️ Cấu trúc dự án

```text
webdev-traffic-AI/
├── backend/                    # FastAPI Server (REST API, WebSocket, AI Forecasting Engine)
│   ├── services/
│   │   ├── ai_engine.py        # Mô hình dự báo chuỗi thời gian & sóng ùn tắc (+15m, +30m, +45m)
│   │   └── traffic_service.py  # Quản lý metadata tuyến, telemetry thời gian thực & kịch bản mô phỏng
│   ├── main.py                 # FastAPI application & WebSocket connection manager
│   ├── models.py               # Pydantic schemas
│   ├── run.py                  # Script khởi động backend (Port 8000)
│   └── requirements.txt        # Thư viện phụ thuộc
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
│   │   └── App.tsx                    # Layout tổng hợp Bento Grid
│   └── package.json
│
├── traffic_scraper/            # Engine cào dữ liệu định kỳ mỗi 15 phút từ TomTom API
│   ├── config/routes.yaml      # Định nghĩa tọa độ 10 tuyến huyết mạch TP. Thủ Đức
│   ├── docs/TECH_DOCS.md       # Tài liệu kiến trúc & đặc tả kỹ thuật chi tiết
│   ├── src/                    # API client, scheduler, data processor, logger
│   └── tests/                  # Bộ 29 unit tests (pytest)
│
├── run_app.py                  # Script 1-click khởi chạy đồng thời cả Backend & Frontend
└── README.md
```

---

## ⚡ Bắt đầu nhanh (Khởi chạy 1-Click)

### 1. Chuẩn bị môi trường

Yêu cầu: **Python 3.11+** và **Node.js 18+**.

```bash
# Clone repository
git clone https://github.com/bechovang/webdev-traffic-AI.git
cd webdev-traffic-AI

# Cài đặt backend & scraper (nếu chưa cài)
traffic_scraper\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt

# Cài đặt frontend
cd frontend
npm install
cd ..
```

### 2. Chạy ứng dụng

Chạy file launcher tích hợp để mở cả Backend và Frontend:

```bash
python run_app.py
```

* **Giao diện Dashboard**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
* **Swagger API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **WebSocket Stream**: `ws://127.0.0.1:8000/ws/traffic`

---

## 🚦 Tính năng nổi bật cho Hội đồng Ban giám khảo

1. **Bản đồ GIS tương tác TP. Thủ Đức**: 10 tuyến đường trọng điểm (Phạm Văn Đồng, Xa Lộ Hà Nội, Mai Chí Thọ, Nguyễn Duy Trinh, Võ Nguyên Giáp...) được tô màu tự động theo cấp độ dịch vụ LOS A (Xanh) đến F (Đỏ thẫm).
2. **Luồng dữ liệu thời gian thực (WebSocket)**: Dashboard nhận cập nhật trực tiếp mỗi 8 giây hoặc ngay lập tức khi nhấn nút **"Cập nhật ngay" (Poll Now)**.
3. **Phân hệ Dự báo AI (+15, +30, +45 phút)**: Kết hợp mô hình suy giảm vận tốc giờ cao điểm và momentum gia tốc lưu lượng, đưa ra khuyến nghị phân luồng giao thông đô thị.
4. **Bảng điều khiển Giả lập Kịch bản (Demo Studio)**: Cho phép chuyển đổi tức thì giữa các tình huống thực tế: *Bình thường, Cao điểm Sáng (7h-9h), Cao điểm Chiều (17h-19h), Sự cố va chạm giao thông, Mưa lớn/Ngập úng*.
5. **Giao diện Civic Tech Light Mode**: Thiết kế theo tiêu chuẩn hệ thống thông tin đô thị hiện đại, độ tương phản cao, tối ưu hiển thị trên màn hình laptop lẫn máy chiếu hội trường.

---

## 🧪 Kiểm thử đơn vị (Unit Tests)

Bộ 29 test cases kiểm tra API client, data validation, scheduler và dead-letter queue:

```bash
cd traffic_scraper
..\traffic_scraper\.venv\Scripts\python.exe -m pytest -v
```

Kết quả: **29/29 tests passed**.

---

## 📄 Giấy phép

Phát triển phục vụ cuộc thi Web Development 2026. Phát hành dưới giấy phép MIT.
