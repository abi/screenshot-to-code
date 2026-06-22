from typing import Any, cast
from unittest.mock import AsyncMock, MagicMock

import pytest
from starlette.websockets import WebSocketDisconnect

from routes.generate_code import WebSocketCommunicator


@pytest.mark.asyncio
async def test_send_message_ignores_already_completed_websocket() -> None:
    websocket = MagicMock()
    websocket.send_json = AsyncMock(
        side_effect=RuntimeError(
            "Unexpected ASGI message 'websocket.send', after sending "
            "'websocket.close' or response already completed."
        )
    )
    communicator = WebSocketCommunicator(cast(Any, websocket))

    await communicator.send_message("status", "Generating", 0)

    assert communicator.is_closed is True
    websocket.send_json.assert_awaited_once()


@pytest.mark.asyncio
async def test_receive_params_marks_websocket_closed_on_disconnect() -> None:
    websocket = MagicMock()
    websocket.receive_json = AsyncMock(side_effect=WebSocketDisconnect(1006))
    communicator = WebSocketCommunicator(cast(Any, websocket))

    with pytest.raises(WebSocketDisconnect):
        await communicator.receive_params()

    assert communicator.is_closed is True


@pytest.mark.asyncio
async def test_close_ignores_already_completed_websocket() -> None:
    websocket = MagicMock()
    websocket.close = AsyncMock(
        side_effect=RuntimeError(
            "Unexpected ASGI message 'websocket.close', after sending "
            "'websocket.close' or response already completed."
        )
    )
    communicator = WebSocketCommunicator(cast(Any, websocket))

    await communicator.close()

    assert communicator.is_closed is True
    websocket.close.assert_awaited_once()


@pytest.mark.asyncio
async def test_throw_error_ignores_already_completed_websocket() -> None:
    websocket = MagicMock()
    websocket.send_json = AsyncMock()
    websocket.close = AsyncMock(
        side_effect=RuntimeError(
            "Unexpected ASGI message 'websocket.close', after sending "
            "'websocket.close' or response already completed."
        )
    )
    communicator = WebSocketCommunicator(cast(Any, websocket))

    await communicator.throw_error("Generation failed")

    assert communicator.is_closed is True
    websocket.send_json.assert_awaited_once()
    websocket.close.assert_awaited_once()
