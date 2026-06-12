# Load environment variables first
from dotenv import load_dotenv

load_dotenv()


import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import IS_DEBUG_ENABLED
from routes import (
    screenshot,
    generate_code,
    home,
    evals,
    export,
    design_systems,
    prompt_reports,
)
from config import IS_PROD
from uploaded_assets import configure_uploaded_asset_routes

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
configure_uploaded_asset_routes(app)


@app.on_event("startup")
async def log_debug_mode() -> None:
    debug_status = "ENABLED" if IS_DEBUG_ENABLED else "DISABLED"
    prod_status = "ENABLED" if IS_PROD else "DISABLED"
    print(f"Backend startup complete. Debug mode is {debug_status}.")
    print(f"Backend prod mode is {prod_status}.")

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
app.include_router(export.router)
app.include_router(design_systems.router)
# Internal dev tooling (unauthenticated) - never mount in prod
if not IS_PROD:
    app.include_router(evals.router)
    app.include_router(prompt_reports.router)
