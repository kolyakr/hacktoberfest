"""`make mock-api`: every endpoint in contracts/api.py, answered with its `ok` fixture, on :8001.
Restarts when contracts/ changes; fixtures are re-read on every request."""

import os
from pathlib import Path

import uvicorn

HERE = Path(__file__).resolve().parent


def build():
    from fastapi.middleware.cors import CORSMiddleware
    from gen_contracts import build_app, load

    from contracts._kit import load_fixture

    _, endpoints, _, _ = load()
    app = build_app(endpoints, serve=lambda ep: load_fixture(ep.response))
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    app.get("/health", include_in_schema=False)(lambda: {"ok": True, "mock": True})
    return app


if __name__ == "__main__":
    uvicorn.run(
        "mock_api:build",
        factory=True,
        port=int(os.getenv("MOCK_API_PORT", "8001")),
        reload=True,
        reload_dirs=[str(HERE.parent / "contracts")],
        app_dir=str(HERE),
    )
