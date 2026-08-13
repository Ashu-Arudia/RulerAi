import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db, Meeting, Summary
from models import SummaryCreate, SummaryUpdate

router = APIRouter(prefix="/summaries", tags=["summaries"])


def _get_scoped_meeting(db: Session, meeting_id: int, user_id: Optional[str]):
    query = db.query(Meeting).filter(Meeting.id == meeting_id)
    if user_id:
        query = query.filter(Meeting.user_id == user_id)
    else:
        query = query.filter(Meeting.user_id == None)  # noqa: E711
    return query.first()


@router.get("/{meeting_id}", response_model=dict)
def get_summary(
    meeting_id: int,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    meeting = _get_scoped_meeting(db, meeting_id, x_user_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    summary = db.query(Summary).filter(Summary.meeting_id == meeting_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")

    return {
        "id": summary.id,
        "meeting_id": summary.meeting_id,
        "overview": summary.overview,
        "key_topics": json.loads(summary.key_topics) if summary.key_topics else [],
        "chapters": json.loads(summary.chapters) if summary.chapters else [],
        "created_at": summary.created_at,
        "updated_at": summary.updated_at,
    }


@router.put("/{meeting_id}", response_model=dict)
def update_summary(
    meeting_id: int,
    update_data: SummaryUpdate,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    meeting = _get_scoped_meeting(db, meeting_id, x_user_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    summary = db.query(Summary).filter(Summary.meeting_id == meeting_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")

    if update_data.overview is not None:
        summary.overview = update_data.overview
    if update_data.key_topics is not None:
        summary.key_topics = json.dumps(update_data.key_topics)
    if update_data.chapters is not None:
        summary.chapters = json.dumps(update_data.chapters)

    summary.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(summary)

    return {
        "id": summary.id,
        "meeting_id": summary.meeting_id,
        "overview": summary.overview,
        "key_topics": json.loads(summary.key_topics),
        "chapters": json.loads(summary.chapters),
        "created_at": summary.created_at,
        "updated_at": summary.updated_at,
    }
