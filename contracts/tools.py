"""Tools: one Args + one Result model per services/ function. Pattern:

    class SearchDocsArgs(BaseModel):
        query: str = Field(description="What to look up")   # Gemma reads the descriptions

    class SearchDocsResult(BaseModel):
        hits: list[str]

    TOOLS = {"search_docs": (SearchDocsArgs, SearchDocsResult, "Search the docs; use for facts.")}

services/__init__.py exposes `REGISTRY = {name: fn(Args) -> Result}` with the same keys.
Callers use `registry()` from contracts._kit, never `import services`.
Each Result needs fixtures/<Result>.ok.json.
"""

from pydantic import BaseModel, Field  # noqa: F401

TOOLS: dict[str, tuple[type[BaseModel], type[BaseModel], str]] = {}
