"""Agent: what api/ passes to the agent and what comes back. Pattern:

    class AgentInput(BaseModel): ...
    class AgentOutput(BaseModel): ...

    AGENT_IO = (AgentInput, AgentOutput)

agent/__init__.py exposes `run(inp: AgentInput) -> AgentOutput`.
AgentOutput needs fixtures/AgentOutput.ok.json (api's fake agent serves it).
"""

from pydantic import BaseModel  # noqa: F401

AGENT_IO: tuple[type[BaseModel], type[BaseModel]] | None = None
