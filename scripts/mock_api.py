"""`make mock-api`: every endpoint in contracts/api.py, answered with a fixture, on :8001.
Restarts when contracts/ changes; fixtures are re-read on every request.

Which fixture: `?mock=<case>` -> fixtures/<Model>.<case>.json; else a path segment that names a case
(GET /api/tickets/T-1043 -> TicketDetail.T-1043.json); else <Model>.ok.json.
"""

import os
from contextvars import ContextVar
from pathlib import Path
from urllib.parse import parse_qs

import uvicorn

HERE = Path(__file__).resolve().parent
_cases: ContextVar[tuple[str, ...]] = ContextVar("mock_cases", default=())


class PickCase:
    """ASGI middleware: remembers the request's candidate fixture cases for serve()."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            query = parse_qs(scope.get("query_string", b"").decode())
            segments = [s for s in scope["path"].split("/") if s]
            _cases.set(tuple(query.get("mock", []) + segments[::-1]))
        await self.app(scope, receive, send)


def build():
    from fastapi.middleware.cors import CORSMiddleware
    from gen_contracts import build_app, load

    from contracts._kit import FIXTURES, load_fixture

    def serve(ep):
        for case in _cases.get():
            if (FIXTURES / f"{ep.response.__name__}.{case}.json").exists():
                return load_fixture(ep.response, case)
        return load_fixture(ep.response)

    _, endpoints, _, _ = load()
    app = build_app(endpoints, serve=serve)
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    app.add_middleware(PickCase)
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
