from typing import Any

import httpx
import pytest

from routes.saas_utils import (
    SubscriptionCreditsCheckError,
    does_user_have_subscription_credits,
)


class _FakeResponse:
    def __init__(self, payload: dict[str, Any], status_code: int = 200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            request = httpx.Request("POST", "https://example.com")
            response = httpx.Response(self.status_code, request=request)
            raise httpx.HTTPStatusError(
                "error", request=request, response=response
            )

    def json(self) -> dict[str, Any]:
        return self._payload


class _FakeClient:
    def __init__(self, outcomes: list[object]):
        self._outcomes = outcomes
        self.calls = 0

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url: str, headers: dict[str, str], timeout: int):
        self.calls += 1
        outcome = self._outcomes[self.calls - 1]
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


@pytest.mark.asyncio
async def test_subscription_credits_retries_connect_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_client = _FakeClient(
        outcomes=[
            httpx.ConnectError("tls eof"),
            httpx.ConnectError("tls eof again"),
            _FakeResponse({"user_id": "user_123", "status": "subscriber_has_credits"}),
        ]
    )
    monkeypatch.setattr(
        "routes.saas_utils.httpx.AsyncClient", lambda: fake_client
    )

    result = await does_user_have_subscription_credits("token")

    assert fake_client.calls == 3
    assert result.user_id == "user_123"
    assert result.status == "subscriber_has_credits"


@pytest.mark.asyncio
async def test_subscription_credits_raises_after_retry_exhaustion(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_client = _FakeClient(
        outcomes=[
            httpx.ConnectError("tls eof"),
            httpx.ConnectError("tls eof"),
            httpx.ConnectError("tls eof"),
        ]
    )
    monkeypatch.setattr(
        "routes.saas_utils.httpx.AsyncClient", lambda: fake_client
    )

    with pytest.raises(SubscriptionCreditsCheckError, match="Unable to verify subscription status right now"):
        await does_user_have_subscription_credits("token")
