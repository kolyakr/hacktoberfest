"""`make contracts`: check contracts/ and its fixtures, then write contracts/_generated/openapi.json
and, if web/ exists, web/src/api/schema.gen.ts."""

import importlib
import inspect
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from fastapi import FastAPI  # noqa: E402
from pydantic import BaseModel, ValidationError  # noqa: E402

from contracts._kit import FIXTURES, Endpoint  # noqa: E402

MODULES = ("contracts.tools", "contracts.agent", "contracts.api")
OPENAPI_TS = "openapi-typescript@7.13.0"


def load():
    """All models by name, plus ENDPOINTS, TOOLS and AGENT_IO."""
    models, mods = {}, {}
    for name in MODULES:
        mods[name] = mod = importlib.import_module(name)
        for attr, obj in vars(mod).items():
            if inspect.isclass(obj) and issubclass(obj, BaseModel) and obj.__module__ == name:
                if attr in models:
                    sys.exit(
                        f"contracts: FAIL\n  {attr} is defined twice; import it from "
                        f"{models[attr].__module__} instead (imports go tools <- agent <- api)"
                    )
                models[attr] = obj
    endpoints = getattr(mods["contracts.api"], "ENDPOINTS", [])
    tools = getattr(mods["contracts.tools"], "TOOLS", {})
    agent_io = getattr(mods["contracts.agent"], "AGENT_IO", None)
    return models, endpoints, tools, agent_io


def unknown_keys(data, dumped, path="$") -> list[str]:
    """Keys in a fixture that the model silently drops (typos, renamed fields)."""
    out = []
    if isinstance(data, dict) and isinstance(dumped, dict):
        for key, value in data.items():
            if key not in dumped:
                out.append(f"{path}.{key}")
            else:
                out += unknown_keys(value, dumped[key], f"{path}.{key}")
    elif isinstance(data, list) and isinstance(dumped, list):
        for i, (a, b) in enumerate(zip(data, dumped, strict=False)):
            out += unknown_keys(a, b, f"{path}[{i}]")
    return out


def check(models, endpoints, tools, agent_io) -> list[str]:
    errors, have = [], set()
    for f in sorted(FIXTURES.glob("*.json")):
        name, _, case = f.stem.partition(".")
        model = models.get(name)
        if not case or model is None:
            errors.append(f"fixtures/{f.name}: name must be <Model>.<case>.json with a model from contracts/")
            continue
        have.add(f.stem)
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            extra = unknown_keys(data, model.model_validate(data).model_dump(mode="json"))
            if extra:
                errors.append(f"fixtures/{f.name}: keys not in {name}: {', '.join(extra)}")
        except (json.JSONDecodeError, ValidationError) as e:
            errors.append(f"fixtures/{f.name}: {e}")

    needed = {ep.response.__name__ for ep in endpoints} | {spec[1].__name__ for spec in tools.values()}
    if agent_io:
        needed.add(agent_io[1].__name__)
    for name in sorted(needed):
        if f"{name}.ok" not in have:
            errors.append(f"missing fixtures/{name}.ok.json (the fakes serve it)")
    return errors


def build_app(endpoints: list[Endpoint], serve=None) -> FastAPI:
    """A FastAPI app with every endpoint. serve(ep) gives the response; None = OpenAPI only."""
    app = FastAPI(title="Team API", separate_input_output_schemas=False)
    for ep in endpoints:
        params = [
            inspect.Parameter(p, inspect.Parameter.KEYWORD_ONLY, annotation=str)
            for p in re.findall(r"{(\w+)}", ep.path)
        ]
        if ep.request:
            params.append(inspect.Parameter("body", inspect.Parameter.KEYWORD_ONLY, annotation=ep.request))

        def route(_ep=ep, **_):
            return serve(_ep) if serve else None

        route.__signature__ = inspect.Signature(params)
        route.__name__ = re.sub(r"\W+", "_", f"{ep.method.lower()}{ep.path}").strip("_")
        app.add_api_route(
            ep.path, route, methods=[ep.method], response_model=ep.response, summary=ep.summary or None
        )
    return app


def main() -> int:
    models, endpoints, tools, agent_io = load()
    errors = check(models, endpoints, tools, agent_io)
    if errors:
        print("contracts: FAIL\n" + "\n".join(f"  - {e}" for e in errors), file=sys.stderr)
        return 1
    print(f"contracts: OK ({len(models)} models, {len(endpoints)} endpoints, {len(tools)} tools)")

    out = ROOT / "contracts/_generated/openapi.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(build_app(endpoints).openapi(), indent=2), encoding="utf-8")
    if not (ROOT / "web/package.json").exists():
        return 0
    ts = ROOT / "web/src/api/schema.gen.ts"
    ts.parent.mkdir(parents=True, exist_ok=True)
    # shutil.which resolves npx.cmd on Windows; macOS/Linux get the same npx as before
    npx = shutil.which("npx") or "npx"
    r = subprocess.run([npx, "--yes", OPENAPI_TS, str(out), "-o", str(ts)], capture_output=True, text=True)
    if r.returncode:
        print(f"contracts: FAIL ({OPENAPI_TS})\n{r.stdout}{r.stderr}", file=sys.stderr)
        return 1
    print(f"  wrote {ts.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
