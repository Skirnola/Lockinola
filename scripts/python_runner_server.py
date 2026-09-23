"""Loopback-only process bridge for the local Lockinola Python lab."""

import argparse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import platform
from pathlib import Path
import re
import shutil
import subprocess
import sys

MAX_REQUEST_BYTES = 12_000
MAX_RESPONSE_BYTES = 64_000
RUN_TIMEOUT_SECONDS = 3.5
RUNNER = Path(__file__).with_name("run_python_exercise.py")


def tool_check(tool, label, command):
    executable = shutil.which(tool)
    if not executable:
        return {"tool": tool, "label": label, "status": "missing", "detail": "Not found on PATH."}
    if not command:
        return {"tool": tool, "label": label, "status": "available", "detail": "CLI found on this computer."}
    try:
        flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        result = subprocess.run(
            [executable, *command], stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            timeout=2.5, check=False, text=True, errors="replace", creationflags=flags,
        )
        lines = [" ".join(line.split()) for line in result.stdout.splitlines() if line.strip()]
        detail = (lines[-1] if lines else "")[:180]
        home = str(Path.home())
        if home:
            detail = detail.replace(home, "~")
        detail = re.sub(r"[A-Za-z]:\\Users\\[^\\\s]+", "~", detail, flags=re.IGNORECASE)
        if result.returncode == 0:
            return {"tool": tool, "label": label, "status": "available", "detail": detail or "CLI responded successfully."}
        return {"tool": tool, "label": label, "status": "error", "detail": detail or "CLI was found but its version check failed."}
    except Exception:
        return {"tool": tool, "label": label, "status": "error", "detail": "CLI was found but did not answer the safe version check."}


def cloud_readiness():
    checked_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    checks = [
        {"tool": "python", "label": "Python", "status": "available", "detail": f"Python {sys.version.split()[0]}"},
        tool_check("git", "Git", ["--version"]),
        tool_check("wsl.exe", "WSL", None),
        tool_check("docker", "Docker CLI", ["--version"]),
        tool_check("aws", "AWS CLI", ["--version"]),
        tool_check("floci", "Floci CLI", ["--version"]),
    ]
    return {
        "status": "ready",
        "platform": platform.system(),
        "checkedAt": checked_at,
        "checks": [{**item, "checkedAt": checked_at} for item in checks],
        "message": "Read-only checks only. No cloud account was contacted and no resource was created.",
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "LockinolaRunner/1"

    def log_message(self, _format, *_args):
        return

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self.send_json(200, {"status": "ready", "python": sys.version.split()[0]})
            return
        if self.path == "/cloud/readiness":
            self.send_json(200, cloud_readiness())
            return
        self.send_json(404, {"status": "error", "message": "Not found."})

    def do_POST(self):
        if self.path != "/run":
            self.send_json(404, {"status": "error", "message": "Not found."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_REQUEST_BYTES:
            self.send_json(413, {"status": "error", "message": "Submission is too large."})
            return
        body = self.rfile.read(length)
        try:
            process = subprocess.run(
                [sys.executable, "-I", "-S", "-B", str(RUNNER)],
                input=body,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=RUN_TIMEOUT_SECONDS,
                check=False,
                env={"PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"},
            )
        except subprocess.TimeoutExpired:
            self.send_json(422, {"status": "error", "message": "Your code ran for more than 3 seconds and was stopped."})
            return
        except Exception:
            self.send_json(503, {"status": "error", "message": "The local Python process could not start."})
            return
        if process.returncode != 0:
            self.send_json(422, {"status": "error", "message": "The local Python process stopped unexpectedly."})
            return
        if len(process.stdout) > MAX_RESPONSE_BYTES:
            self.send_json(422, {"status": "error", "message": "The runner produced too much output."})
            return
        try:
            payload = json.loads(process.stdout.decode("utf-8"))
        except Exception:
            self.send_json(422, {"status": "error", "message": "The runner returned an unreadable result."})
            return
        self.send_json(200, payload)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4317)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Lockinola Python runner ready on 127.0.0.1:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
