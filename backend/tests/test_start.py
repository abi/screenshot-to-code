import start


def test_find_available_port_skips_bound_port(monkeypatch):
    monkeypatch.setattr(
        start,
        "is_port_available",
        lambda _host, port: port == 7003,
    )

    assert start.find_available_port("127.0.0.1", 7001, 20) == 7003
