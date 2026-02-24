import base64

from video.utils import extract_tag_content, get_video_bytes_and_mime_type


class TestExtractTagContent:
    def test_extracts_simple_tag(self) -> None:
        text = "<description>A red button</description>"
        assert extract_tag_content("description", text) == "<description>A red button</description>"

    def test_tag_not_found(self) -> None:
        text = "<other>content</other>"
        assert extract_tag_content("description", text) == ""

    def test_extracts_from_surrounding_text(self) -> None:
        text = "Some preamble <code>print('hi')</code> and more text"
        assert extract_tag_content("code", text) == "<code>print('hi')</code>"

    def test_multiline_content(self) -> None:
        text = "<plan>\nStep 1: Do X\nStep 2: Do Y\n</plan>"
        result = extract_tag_content("plan", text)
        assert "Step 1: Do X" in result
        assert "Step 2: Do Y" in result

    def test_missing_closing_tag(self) -> None:
        text = "<description>No closing tag"
        assert extract_tag_content("description", text) == ""

    def test_missing_opening_tag(self) -> None:
        text = "No opening tag</description>"
        assert extract_tag_content("description", text) == ""

    def test_empty_content(self) -> None:
        text = "<tag></tag>"
        assert extract_tag_content("tag", text) == "<tag></tag>"

    def test_nested_same_tag_picks_first_close(self) -> None:
        text = "<a>outer<a>inner</a>rest</a>"
        result = extract_tag_content("a", text)
        assert result == "<a>outer<a>inner</a>"


class TestGetVideoBytesAndMimeType:
    def test_mp4_data_url(self) -> None:
        raw_bytes = b"fake video content"
        encoded = base64.b64encode(raw_bytes).decode()
        data_url = f"data:video/mp4;base64,{encoded}"

        video_bytes, mime_type = get_video_bytes_and_mime_type(data_url)
        assert video_bytes == raw_bytes
        assert mime_type == "video/mp4"

    def test_webm_data_url(self) -> None:
        raw_bytes = b"\x1a\x45\xdf\xa3"
        encoded = base64.b64encode(raw_bytes).decode()
        data_url = f"data:video/webm;base64,{encoded}"

        video_bytes, mime_type = get_video_bytes_and_mime_type(data_url)
        assert video_bytes == raw_bytes
        assert mime_type == "video/webm"

    def test_empty_content(self) -> None:
        encoded = base64.b64encode(b"").decode()
        data_url = f"data:video/mp4;base64,{encoded}"

        video_bytes, mime_type = get_video_bytes_and_mime_type(data_url)
        assert video_bytes == b""
        assert mime_type == "video/mp4"
