"""
DEBATE ARENA — One-click launcher
Starts both FastAPI backend and Vite React frontend.
"""
import subprocess
import sys
import time
import os

ROOT = os.path.dirname(os.path.abspath(__file__))


def run():
    env_path = os.path.join(ROOT, ".env")
    if not os.path.exists(env_path):
        print("[ERROR] .env file not found.")
        print("  Copy .env.example and set GOOGLE_API_KEY:")
        print("  copy .env.example .env")
        return

    print("[1/2] Starting FastAPI Backend (port 8000)...")
    backend = subprocess.Popen(
        [sys.executable, "main.py"],
        cwd=os.path.join(ROOT, "backend"),
    )
    time.sleep(3)

    print("[2/2] Starting React Frontend (port 5173)...")
    frontend = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=os.path.join(ROOT, "frontend"),
        shell=True,
    )

    print()
    print("  Frontend: http://localhost:5173")
    print("  Backend:  http://localhost:8000")
    print("  Ctrl+C to stop")
    print()

    try:
        backend.wait()
        frontend.wait()
    except KeyboardInterrupt:
        print("\nStopping services...")
        backend.terminate()
        frontend.terminate()


if __name__ == "__main__":
    run()
