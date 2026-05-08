from io import BytesIO
from zipfile import ZipFile

import pytest

from routes.export import ExportRequest, export_code


@pytest.mark.asyncio
async def test_export_code_rewrites_data_url_images_into_zip_assets() -> None:
    png_data_url = "data:image/png;base64,iVBORw0KGgo="
    svg_data_url = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E"
    code = f"""
    <html>
      <head>
        <style>.hero {{ background-image: url("{svg_data_url}"); }}</style>
      </head>
      <body>
        <img src="{png_data_url}" />
      </body>
    </html>
    """

    response = await export_code(ExportRequest(code=code))

    with ZipFile(BytesIO(response.body)) as archive:
        assert sorted(archive.namelist()) == [
            "assets/image-1.png",
            "assets/image-2.svg",
            "index.html",
        ]

        index_html = archive.read("index.html").decode("utf-8")
        assert 'src="assets/image-1.png"' in index_html
        assert 'url("assets/image-2.svg")' in index_html
        assert archive.read("assets/image-1.png") == b"\x89PNG\r\n\x1a\n"
        assert archive.read("assets/image-2.svg").startswith(b"<svg")


@pytest.mark.asyncio
async def test_export_code_returns_zip_with_index_when_no_assets() -> None:
    response = await export_code(ExportRequest(code="<html><body>Hello</body></html>"))

    with ZipFile(BytesIO(response.body)) as archive:
        assert archive.namelist() == ["index.html"]
        assert archive.read("index.html").decode("utf-8") == (
            "<html><body>Hello</body></html>"
        )
