# WebSocket protocol (RFC 6455) allows for the use of custom close codes in the range 4000-4999
# RFC 6455 custom-code range: 4000-4999
# Used when the backend encounters an application-level error that requires
# the client to reconnect rather than continue the session.
APP_ERROR_WEB_SOCKET_CODE = 4332

# Used when a generation is aborted because a per-step or cumulative spend
# budget was exceeded. Unlike APP_ERROR_WEB_SOCKET_CODE this does not invalidate
# the session — the frontend may surface the message and stay connected.
BUDGET_EXCEEDED_CODE = 4333
