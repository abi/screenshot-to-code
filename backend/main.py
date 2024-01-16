# Load environment variables first
from fastapi.staticfiles import StaticFiles
from routes import screenshot, generate_code, home, evals
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()


app = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)

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

if home.IS_BUILD:
    # if in build mode, serve webui folder as static files
    app.mount("/", StaticFiles(directory="webui", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
