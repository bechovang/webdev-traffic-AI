"""Full-stack Application Runner for HCM Traffic AI Intelligence.

Launches both FastAPI Backend (port 8000) and React Frontend (port 5173).
Press Ctrl+C to gracefully terminate both services.
"""

import os
import signal
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
PYTHON_EXE = ROOT_DIR / "traffic_scraper" / ".venv" / "Scripts" / "python.exe"

if not PYTHON_EXE.exists():
    PYTHON_EXE = Path(sys.executable)


def main():
    print("=" * 65)
    print("🚦 HCM CITY TRAFFIC INTELLIGENCE DASHBOARD — TP. THỦ ĐỨC")
    print("=" * 65)
    print(f"[*] Python Runtime: {PYTHON_EXE}")
    print("[*] Starting FastAPI Backend on http://127.0.0.1:8000 ...")

    backend_proc = subprocess.Popen(
        [str(PYTHON_EXE), str(ROOT_DIR / "backend" / "run.py")],
        cwd=str(ROOT_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    # Wait 2 seconds for backend to start
    time.sleep(2)

    print("[*] Starting React Frontend on http://127.0.0.1:5173 ...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=str(ROOT_DIR / "frontend"),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    print("\n✅ Hệ thống đã sẵn sàng!")
    print("👉 Giao diện Dashboard: http://127.0.0.1:5173")
    print("👉 Swagger API Docs:    http://127.0.0.1:8000/docs")
    print("👉 WebSocket Stream:    ws://127.0.0.1:8000/ws/traffic")
    print("\n[i] Nhấn Ctrl+C để dừng toàn bộ hệ thống.\n")

    # Open browser
    try:
        webbrowser.open("http://127.0.0.1:5173")
    except Exception:
        pass

    def shutdown(signum=None, frame=None):
        print("\n[*] Đang tắt hệ thống...")
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
            backend_proc.wait(timeout=3)
            frontend_proc.wait(timeout=3)
        except Exception:
            backend_proc.kill()
            frontend_proc.kill()
        print("[*] Đã tắt thành công.")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        while True:
            # Poll status
            if backend_proc.poll() is not None:
                print("[!] Backend dừng đột ngột:")
                print(backend_proc.stdout.read())
                break
            if frontend_proc.poll() is not None:
                print("[!] Frontend dừng đột ngột:")
                print(frontend_proc.stdout.read())
                break
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown()


if __name__ == "__main__":
    main()
