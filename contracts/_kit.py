"""Contract helpers. Product code imports these; no product logic lives here."""

import os
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from pydantic import BaseModel

FIXTURES = Path(__file__).resolve().parent / "fixtures"


@dataclass(frozen=True)
class Endpoint:
    """One HTTP endpoint. `make contracts` turns contracts/api.py ENDPOINTS into OpenAPI + TS types;
    `make mock-api` answers it with the response's `ok` fixture. Path params are written as {name}."""

    method: str
    path: str
    response: type[BaseModel]
    request: type[BaseModel] | None = None
    summary: str = ""


def load_fixture[M: BaseModel](model: type[M], case: str = "ok") -> M:
    """The shared example of `model` (fixtures/<Model>.<case>.json). Every fake uses this."""
    path = FIXTURES / f"{model.__name__}.{case}.json"
    return model.model_validate_json(path.read_text(encoding="utf-8"))


def impl(switch: str) -> str:
    """'fake' or 'real' for AGENT_IMPL or TOOLS_IMPL (default: fake)."""
    value = os.getenv(switch, "fake").strip().lower()
    if value not in ("fake", "real"):
        raise ValueError(f"{switch} must be 'fake' or 'real', got {value!r}")
    return value


def registry() -> dict[str, Callable[[BaseModel], BaseModel]]:
    """The services/ functions by name. TOOLS_IMPL=fake: each returns its Result's `ok` fixture.
    TOOLS_IMPL=real: services.REGISTRY, imported here so a broken service never breaks startup."""
    if impl("TOOLS_IMPL") == "real":
        from services import REGISTRY

        return REGISTRY
    from contracts.tools import TOOLS

    def fake(result: type[BaseModel]) -> Callable[[BaseModel], BaseModel]:
        return lambda _args: load_fixture(result)

    return {name: fake(spec[1]) for name, spec in TOOLS.items()}
