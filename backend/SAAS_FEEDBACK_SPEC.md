# SaaS Repo Feedback Call Interest Endpoint Specification

This document specifies the API endpoint and database schema needed in the SaaS repo to store feedback call interest responses from users.

## API Endpoint

### POST `/feedback/call-interest`

Stores a user's feedback call interest response.

**Authentication:** Bearer token (Clerk JWT)

**Request Body:**
```json
{
  "speaks_english_fluently": boolean,
  "has_time_for_call": boolean
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Response (401 Unauthorized):**
```json
{
  "detail": "Unauthorized"
}
```

## Database Schema

### SQL Table: `feedback_call_interest`

```sql
CREATE TABLE feedback_call_interest (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    speaks_english_fluently BOOLEAN NOT NULL,
    has_time_for_call BOOLEAN NOT NULL,
    subscriber_tier VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying by user
CREATE INDEX idx_feedback_call_interest_user_id ON feedback_call_interest(user_id);

-- Index for filtering eligible users (subscribers who speak English and have time)
CREATE INDEX idx_feedback_call_interest_eligible ON feedback_call_interest(speaks_english_fluently, has_time_for_call, subscriber_tier);

-- Index for created_at for sorting/filtering by date
CREATE INDEX idx_feedback_call_interest_created_at ON feedback_call_interest(created_at);
```

## Python Implementation (FastAPI)

### Pydantic Models

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid


class FeedbackCallInterestRequest(BaseModel):
    speaks_english_fluently: bool
    has_time_for_call: bool


class FeedbackCallInterestResponse(BaseModel):
    success: bool


class FeedbackCallInterestRecord(BaseModel):
    id: uuid.UUID
    user_id: str
    email: Optional[str]
    speaks_english_fluently: bool
    has_time_for_call: bool
    subscriber_tier: Optional[str]
    created_at: datetime
    updated_at: datetime
```

### Route Handler

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

router = APIRouter()


@router.post("/feedback/call-interest", response_model=FeedbackCallInterestResponse)
async def submit_feedback_call_interest(
    request: FeedbackCallInterestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check if user already submitted feedback
    existing = db.query(FeedbackCallInterest).filter(
        FeedbackCallInterest.user_id == current_user.id
    ).first()

    if existing:
        # Update existing record
        existing.speaks_english_fluently = request.speaks_english_fluently
        existing.has_time_for_call = request.has_time_for_call
        existing.subscriber_tier = current_user.subscriber_tier
        existing.updated_at = datetime.utcnow()
    else:
        # Create new record
        feedback = FeedbackCallInterest(
            user_id=current_user.id,
            email=current_user.email,
            speaks_english_fluently=request.speaks_english_fluently,
            has_time_for_call=request.has_time_for_call,
            subscriber_tier=current_user.subscriber_tier,
        )
        db.add(feedback)

    db.commit()

    return FeedbackCallInterestResponse(success=True)
```

### SQLAlchemy Model

```python
from sqlalchemy import Column, String, Boolean, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from database import Base


class FeedbackCallInterest(Base):
    __tablename__ = "feedback_call_interest"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    speaks_english_fluently = Column(Boolean, nullable=False)
    has_time_for_call = Column(Boolean, nullable=False)
    subscriber_tier = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_feedback_eligible', 'speaks_english_fluently', 'has_time_for_call', 'subscriber_tier'),
    )
```

## Business Logic Notes

1. **Upsert Behavior:** If a user submits feedback multiple times, update their existing record rather than creating duplicates.

2. **Subscriber Tier:** Store the user's subscriber tier at the time of submission to track which tier they were on when they expressed interest.

3. **Calendar Eligibility:** The frontend shows the Cal.com calendar embed only if:
   - User is a subscriber (tier != "free" and tier != "")
   - User answered "Yes" to speaking English fluently
   - User answered "Yes" to having time for a call

4. **All Responses Saved:** Responses from all users (subscribers and non-subscribers) are saved to the database.

## Query Examples

### Find all eligible users for feedback calls (subscribers who said yes to both questions)

```sql
SELECT *
FROM feedback_call_interest
WHERE speaks_english_fluently = true
  AND has_time_for_call = true
  AND subscriber_tier IS NOT NULL
  AND subscriber_tier != 'free'
ORDER BY created_at DESC;
```

### Get feedback summary statistics

```sql
SELECT
  COUNT(*) as total_responses,
  SUM(CASE WHEN speaks_english_fluently THEN 1 ELSE 0 END) as english_speakers,
  SUM(CASE WHEN has_time_for_call THEN 1 ELSE 0 END) as available_for_call,
  SUM(CASE WHEN speaks_english_fluently AND has_time_for_call THEN 1 ELSE 0 END) as eligible_total,
  SUM(CASE WHEN speaks_english_fluently AND has_time_for_call AND subscriber_tier IS NOT NULL AND subscriber_tier != 'free' THEN 1 ELSE 0 END) as eligible_subscribers
FROM feedback_call_interest;
```
