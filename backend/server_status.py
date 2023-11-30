from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/status")
async def get_status():
    message = "Your backend server is running correctly"
    return JSONResponse(content={"message": message})
