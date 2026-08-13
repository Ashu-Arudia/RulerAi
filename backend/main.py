from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_tables
from seed_data import seed_database
from routers import meetings, transcripts, summaries, action_items

app = FastAPI(
    title="Ruler AI",
    description="Meeting Notes & Transcription Platform API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(meetings.router)
app.include_router(transcripts.router)
app.include_router(summaries.router)
app.include_router(action_items.router)


@app.on_event("startup")
def startup_event():
    create_tables()
    seed_database()


@app.get("/")
def root():
    return {"message": "Fireflies Clone API", "version": "1.0.0", "status": "healthy"}


@app.get("/search")
def global_search(q: str, db=None):
    """Global search endpoint — delegates to transcripts router."""
    from fastapi import Query as FQuery
    return {"query": q, "message": "Use /transcripts/search/global?q=<term>"}
