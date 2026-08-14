import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from database import create_tables
from seed_data import seed_database
from routers import meetings, transcripts, summaries, action_items, users
from routers import llm as llm_router

app = FastAPI(
    title="RulerAI",
    description="Meeting Notes & Transcription Platform API",
    version="1.0.0",
)

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ruler-ai.vercel.app",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-User-Id"],
)

# Serve static sample transcripts
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Include routers — LLM must come BEFORE transcripts to avoid /{id} collision
app.include_router(meetings.router)
app.include_router(llm_router.router)   # /transcripts/samples, /transcripts/clean
app.include_router(transcripts.router)  # /transcripts/{meeting_id}
app.include_router(summaries.router)
app.include_router(action_items.router)
app.include_router(users.router)


@app.on_event("startup")
def startup_event():
    create_tables()
    seed_database()


@app.get("/")
@app.get("/health")
def root():
    return {"message": "RulerAI API", "version": "1.0.0", "status": "healthy"}


@app.get("/search")
def global_search(q: str, db=None):
    """Global search endpoint — delegates to transcripts router."""
    return {"query": q, "message": "Use /transcripts/search/global?q=<term>"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

