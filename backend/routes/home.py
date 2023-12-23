from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from pathlib import Path


router = APIRouter()


@router.get("/")
async def get_status():
    html_path = Path('templates', 'index.html').resolve()
    html_content = ''
    with html_path.open('rt') as file:
        html_content = file.read()
    return HTMLResponse(
        content=html_content
    )
