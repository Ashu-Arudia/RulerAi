import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session

from database import get_db, TranscriptLine, Meeting

router = APIRouter(prefix="/transcripts", tags=["transcripts"])


def _scope_meeting(db: Session, meeting_id: int, user_id: Optional[str]):
    """Return meeting only if it belongs to the right scope."""
    query = db.query(Meeting).filter(Meeting.id == meeting_id)
    if user_id:
        query = query.filter(Meeting.user_id == user_id)
    else:
        query = query.filter(Meeting.user_id == None)  # noqa: E711
    return query.first()


@router.get("/{meeting_id}", response_model=List[dict])
def get_transcript(
    meeting_id: int,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    meeting = _scope_meeting(db, meeting_id, x_user_id)
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
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Search transcript lines scoped to the caller's data space."""
    if not q or len(q) < 2:
        return []

    query = (
        db.query(TranscriptLine, Meeting)
        .join(Meeting, TranscriptLine.meeting_id == Meeting.id)
        .filter(TranscriptLine.text.ilike(f"%{q}%"))
    )

    if x_user_id:
        query = query.filter(Meeting.user_id == x_user_id)
    else:
        query = query.filter(Meeting.user_id == None)  # noqa: E711

    lines = query.limit(50).all()

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
