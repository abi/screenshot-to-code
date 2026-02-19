# Load environment variables first
from dotenv import load_dotenv

load_dotenv()


import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import IS_DEBUG_ENABLED
from routes import screenshot, generate_code, home, evals
from config import IS_PROD

# Setup Sentry (only relevant in prod)
if IS_PROD:
    import sentry_sdk

    SENTRY_DSN = os.environ.get("SENTRY_DSN")
    if not SENTRY_DSN:
        raise Exception("SENTRY_DSN not found in prod environment")

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0,
        profiles_sample_rate=0.1,
    )

# Setup FastAPI
app = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)


@app.on_event("startup")
async def log_debug_mode() -> None:
    debug_status = "ENABLED" if IS_DEBUG_ENABLED else "DISABLED"
    print(f"Backend startup complete. Debug mode is {debug_status}.")

# Configure CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add routes
app.include_router(generate_code.router)
app.include_router(screenshot.router)
app.include_router(home.router)
app.include_router(evals.router)
