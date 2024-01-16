import os
from fastapi import APIRouter
from fastapi.responses import FileResponse, HTMLResponse


router = APIRouter()


# if webui folder exists, we are in build mode
IS_BUILD = os.path.exists("webui")


@router.get("/")
async def get_status():
    if IS_BUILD:
        # if in build mode, return webui/index.html
        return FileResponse("webui/index.html")
    else:
        return HTMLResponse(
            content="<h3>Your backend is running correctly. Please open the front-end URL (default is http://localhost:5173) to use screenshot-to-code.</h3>"
        )
