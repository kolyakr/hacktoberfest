"""HTTP API: the shapes web/ sees. Pattern:

    class AskRequest(BaseModel):
        question: str

    class AskResponse(BaseModel):
        answer: str
        model: str                      # Gemma model id, shown in the UI

    ENDPOINTS = [Endpoint("POST", "/api/ask", request=AskRequest, response=AskResponse)]

Each response model needs fixtures/<Model>.ok.json. Then run `make contracts`.
"""

from pydantic import BaseModel  # noqa: F401

from contracts._kit import Endpoint

ENDPOINTS: list[Endpoint] = []
