import argparse
import asyncio
import socket
import sys

import uvicorn


def is_port_available(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
        except OSError:
            return False

    return True


def find_available_port(host: str, start_port: int, max_attempts: int) -> int:
    for port in range(start_port, start_port + max_attempts):
        if is_port_available(host, port):
            return port

    raise RuntimeError(
        f"No available port found from {start_port} to "
        f"{start_port + max_attempts - 1}"
    )


def configure_event_loop() -> None:
    """Use a subprocess-capable event loop for Playwright on Windows."""
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=7001)
    parser.add_argument("--max-port-attempts", type=int, default=20)
    args = parser.parse_args()

    port = find_available_port(args.host, args.port, args.max_port_attempts)
    if port != args.port:
        print(f"Port {args.port} is in use. Starting backend on port {port}.")

    configure_event_loop()
    # Uvicorn's asyncio setup deliberately switches to SelectorEventLoop when
    # reload is enabled on Windows. Playwright needs ProactorEventLoop for its
    # child-process transport, so leave loop setup to configure_event_loop().
    uvicorn.run("main:app", host=args.host, port=port, reload=True, loop="none")
