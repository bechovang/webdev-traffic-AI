"""Full-stack Application Runner for HCM Traffic AI Intelligence.

Launches both FastAPI Backend (port 8000) and React Frontend (port 5173).
Press Ctrl+C to stop both services.
"""

import os
import signal
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
PYTHON_EXE = ROOT_DIR / ".venv" / "Scripts" / "python.exe"

if not PYTHON_EXE.exists():
    PYTHON_EXE = Path(sys.executable)


def main():
    print("=" * 65)
    print("🚦 HCM CITY TRAFFIC INTELLIGENCE DASHBOARD — TP. THỦ ĐỨC")
    print("=" * 65)
    print(f"[*] Python: {PYTHON_EXE}")

    # 1. Start Backend
    print("[*] Khởi động Backend (FastAPI) tại http://127.0.0.1:8000 ...")
    backend_proc = subprocess.Popen(
        [str(PYTHON_EXE), str(ROOT_DIR / "backend" / "run.py")],
        cwd=str(ROOT_DIR),
    )

    time.sleep(1.5)

    # 2. Start Frontend
    print("[*] Khởi động Frontend (React + Vite) tại http://127.0.0.1:5173 ...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=str(ROOT_DIR / "frontend"),
        shell=True if os.name == "nt" else False,
    )

    print("\n✅ Cả 2 dịch vụ đang chạy!")
    print("👉 Giao diện Dashboard: http://127.0.0.1:5173")
    print("👉 Swagger API Docs:    http://127.0.0.1:8000/docs")
    print("\n[i] Đang tự động mở trình duyệt web... (Nhấn Ctrl+C để dừng cả 2 dịch vụ)\n")

    time.sleep(1.5)
    try:
        webbrowser.open("http://127.0.0.1:5173")
    except Exception:
        pass

    def shutdown(signum=None, frame=None):
        print("\n[*] Đang tắt hệ thống...")
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
            backend_proc.wait(timeout=2)
            frontend_proc.wait(timeout=2)
        except Exception:
            backend_proc.kill()
            frontend_proc.kill()
        print("[*] Đã tắt toàn bộ dịch vụ.")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        while True:
            if backend_proc.poll() is not None:
                print("[!] Backend đã dừng.")
                break
            if frontend_proc.poll() is not None:
                print("[!] Frontend đã dừng.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown()


if __name__ == "__main__":
    main()
