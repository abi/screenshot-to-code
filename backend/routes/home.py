from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import FileResponse, HTMLResponse

router = APIRouter()
FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@router.get("/")
async def get_home():
    index_file = FRONTEND_DIST / "index.html"
    if index_file.is_file():
        return FileResponse(index_file)
    return HTMLResponse(
        content="<h3>Your backend is running correctly. Frontend build not found.</h3>"
    )
