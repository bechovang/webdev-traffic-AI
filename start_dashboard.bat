@echo off
chcp 65001 >nul
echo =================================================================
echo  🚦 HCM CITY TRAFFIC INTELLIGENCE DASHBOARD - TP. THỦ ĐỨC
echo =================================================================
echo.

cd /d "%~dp0"

echo [*] Đang khởi động Backend FastAPI (Port 8000)...
start "Traffic AI - Backend (Port 8000)" cmd /k ".venv\Scripts\python.exe backend\run.py"

timeout /t 2 /nobreak >nul

echo [*] Đang khởi động Frontend React Vite (Port 5173)...
start "Traffic AI - Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo.
echo ✅ Đang mở trình duyệt Dashboard...
start http://127.0.0.1:5173

echo.
echo Dashboard: http://127.0.0.1:5173
echo API Docs:  http://127.0.0.1:8000/docs
echo.
pause
