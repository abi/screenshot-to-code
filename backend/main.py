# Load environment variables first
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes import screenshot, generate_code, home, evals

app = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)

# Configure CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount assets folder
assets = Path(__file__).resolve().parent / "assets"
if not assets.exists():
    assets.mkdir()
app.mount('/assets', StaticFiles(directory=assets, html=True),  name='static')

# Add routes
app.include_router(generate_code.router)
app.include_router(screenshot.router)
app.include_router(home.router)
app.include_router(evals.router)
