from routes.figma import parse_figma_url
import pytest


def test_parse_figma_design_url_with_node_id() -> None:
    url = "https://www.figma.com/design/ABC123def/MyFile?node-id=1-2"
    file_key, node_id = parse_figma_url(url)
    assert file_key == "ABC123def"
    assert node_id == "1:2"


def test_parse_figma_file_url_with_colon_node_id() -> None:
    url = "https://www.figma.com/file/XYZ789/SomeFile?node-id=10:45"
    file_key, node_id = parse_figma_url(url)
    assert file_key == "XYZ789"
    assert node_id == "10:45"


def test_parse_figma_url_without_node_id() -> None:
    url = "https://www.figma.com/design/ABC123/MyFile"
    file_key, node_id = parse_figma_url(url)
    assert file_key == "ABC123"
    assert node_id is None


def test_parse_figma_proto_url() -> None:
    url = "https://www.figma.com/proto/ABC123/MyProto?node-id=5-10"
    file_key, node_id = parse_figma_url(url)
    assert file_key == "ABC123"
    assert node_id == "5:10"


def test_parse_invalid_url_raises() -> None:
    with pytest.raises(ValueError, match="Invalid Figma URL"):
        parse_figma_url("https://example.com/not-figma")
