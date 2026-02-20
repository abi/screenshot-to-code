from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import pytest
from fastapi import WebSocket

from routes.generate_code import (
    ParameterExtractionMiddleware,
    ParameterExtractionStage,
    PipelineContext,
)


@pytest.mark.asyncio
async def test_parameter_extraction_middleware_sends_error_without_reraising(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def receive_params() -> dict[str, Any]:
        return {"generationType": "create"}

    throw_error = AsyncMock()
    context = PipelineContext(websocket=cast(WebSocket, SimpleNamespace()))
    context.ws_comm = cast(
        Any,
        SimpleNamespace(
            receive_params=receive_params,
            throw_error=throw_error,
        ),
    )

    async def fail_extract(self, params: dict[str, Any]):
        raise Exception("boom")

    monkeypatch.setattr(
        ParameterExtractionStage, "extract_and_validate", fail_extract
    )

    next_called = False

    async def next_func() -> None:
        nonlocal next_called
        next_called = True

    middleware = ParameterExtractionMiddleware()
    await middleware.process(context, next_func)

    throw_error.assert_called_once()
    assert "An unexpected error occurred: boom" in throw_error.call_args.args[0]
    assert next_called is False
