import start


def test_find_available_port_skips_bound_port(monkeypatch):
    monkeypatch.setattr(
        start,
        "is_port_available",
        lambda _host, port: port == 7003,
    )

    assert start.find_available_port("127.0.0.1", 7001, 20) == 7003


def test_configure_event_loop_uses_proactor_on_windows(monkeypatch):
    policy = object()
    calls = []

    monkeypatch.setattr(start.sys, "platform", "win32")
    monkeypatch.setattr(
        start.asyncio,
        "WindowsProactorEventLoopPolicy",
        lambda: policy,
        raising=False,
    )
    monkeypatch.setattr(start.asyncio, "set_event_loop_policy", calls.append)

    start.configure_event_loop()

    assert calls == [policy]
