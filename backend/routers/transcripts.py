import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db, TranscriptLine, Meeting
from models import SearchResult

router = APIRouter(prefix="/transcripts", tags=["transcripts"])


@router.get("/{meeting_id}", response_model=List[dict])
def get_transcript(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    lines = (
        db.query(TranscriptLine)
        .filter(TranscriptLine.meeting_id == meeting_id)
        .order_by(TranscriptLine.start_time)
        .all()
    )
    return [
        {
            "id": l.id,
            "meeting_id": l.meeting_id,
            "speaker": l.speaker,
            "text": l.text,
            "start_time": l.start_time,
            "end_time": l.end_time,
        }
        for l in lines
    ]


@router.get("/search/global", response_model=List[dict])
def global_search(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
):
    """Search across all transcript lines globally."""
    if not q or len(q) < 2:
        return []

    lines = (
        db.query(TranscriptLine, Meeting)
        .join(Meeting, TranscriptLine.meeting_id == Meeting.id)
        .filter(TranscriptLine.text.ilike(f"%{q}%"))
        .limit(50)
        .all()
    )

    results = []
    for line, meeting in lines:
        results.append({
            "meeting_id": meeting.id,
            "meeting_title": meeting.title,
            "meeting_date": meeting.date,
            "transcript_line_id": line.id,
            "speaker": line.speaker,
            "text": line.text,
            "start_time": line.start_time,
        })
    return results
