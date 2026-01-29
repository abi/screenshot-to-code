import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from config import BACKEND_SAAS_URL


router = APIRouter()


class FeedbackCallInterestRequest(BaseModel):
    speaks_english_fluently: bool
    has_time_for_call: bool


class FeedbackCallInterestResponse(BaseModel):
    success: bool


@router.post("/feedback/call-interest", response_model=FeedbackCallInterestResponse)
async def submit_feedback_call_interest(
    request: FeedbackCallInterestRequest,
    authorization: str = Header(None),
):
    if not BACKEND_SAAS_URL:
        raise HTTPException(status_code=500, detail="SaaS backend URL not configured")

    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    async with httpx.AsyncClient() as client:
        url = BACKEND_SAAS_URL + "/feedback/call-interest"
        headers = {
            "Content-Type": "application/json",
            "Authorization": authorization,
        }
        response = await client.post(
            url,
            json=request.model_dump(),
            headers=headers,
            timeout=60,
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail="Failed to submit feedback to SaaS backend",
            )

        return FeedbackCallInterestResponse(success=True)
