"""Run the zero-dependency simulator with the correct JavaScript module MIME type."""

import argparse
import mimetypes
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class NoCacheHandler(SimpleHTTPRequestHandler):
    """Always serve fresh files so edits are visible after a simple reload."""

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format: str, *args) -> None:  # noqa: A002 - signature from base class
        pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Аким на 5 часов — локальный сервер")
    parser.add_argument("--port", type=int, default=8000, help="порт (по умолчанию 8000)")
    args = parser.parse_args()

    mimetypes.add_type("text/javascript", ".mjs")
    mimetypes.add_type("text/plain; charset=utf-8", ".md")
    root = Path(__file__).resolve().parent
    handler = partial(NoCacheHandler, directory=str(root))
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    except OSError:
        print(f"Порт {args.port} занят. Запустите, например: python server.py --port {args.port + 1}", file=sys.stderr)
        sys.exit(1)
    print(f"Откройте http://127.0.0.1:{args.port}  (остановить: Ctrl+C)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nСервер остановлен.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
