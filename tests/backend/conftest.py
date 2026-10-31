import pytest


@pytest.fixture(autouse=True)
def memory_store(monkeypatch):
    """Backend tests never touch Supabase, whatever .env says."""
    monkeypatch.setenv("STORE", "memory")
