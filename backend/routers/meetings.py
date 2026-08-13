import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime

from database import get_db, Meeting, TranscriptLine, Summary, ActionItem, MeetingTag
from models import MeetingCreate, MeetingUpdate, MeetingOut, MeetingDetailOut, SummaryOut, ActionItemOut

router = APIRouter(prefix="/meetings", tags=["meetings"])


def _scope(query, user_id: Optional[str]):
    """
    Demo requests (no X-User-Id header) → user_id IS NULL (seeded demo data).
    Authenticated requests → filter by their google_id.
    """
    if user_id:
        return query.filter(Meeting.user_id == user_id)
    return query.filter(Meeting.user_id == None)  # noqa: E711


def _meeting_to_out(meeting: Meeting) -> dict:
    return {
        "id": meeting.id,
        "title": meeting.title,
        "date": meeting.date,
        "duration_seconds": meeting.duration_seconds,
        "host": meeting.host,
        "participants": json.loads(meeting.participants) if meeting.participants else [],
        "status": meeting.status,
        "audio_url": meeting.audio_url,
        "thumbnail_color": meeting.thumbnail_color,
        "channel": meeting.channel,
        "created_at": meeting.created_at,
        "updated_at": meeting.updated_at,
        "action_items": [
            {
                "id": ai.id,
                "meeting_id": ai.meeting_id,
                "text": ai.text,
                "assignee": ai.assignee,
                "due_date": ai.due_date,
                "completed": ai.completed,
                "created_at": ai.created_at,
                "updated_at": ai.updated_at,
            }
            for ai in (meeting.action_items or [])
        ],
        "tags": [t.tag for t in (meeting.tags or [])],
    }


@router.get("", response_model=List[dict])
def list_meetings(
    search: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    sort: str = Query("date_desc"),
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    query = _scope(db.query(Meeting), x_user_id)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Meeting.title.ilike(search_term),
                Meeting.host.ilike(search_term),
                Meeting.participants.ilike(search_term),
            )
        )

    if channel and channel != "All Meetings":
        query = query.filter(Meeting.channel == channel)

    if sort == "date_desc":
        query = query.order_by(Meeting.date.desc())
    elif sort == "date_asc":
        query = query.order_by(Meeting.date.asc())
    elif sort == "title_asc":
        query = query.order_by(Meeting.title.asc())
    elif sort == "duration_desc":
        query = query.order_by(Meeting.duration_seconds.desc())

    meetings = query.all()
    return [_meeting_to_out(m) for m in meetings]


@router.get("/{meeting_id}", response_model=dict)
def get_meeting(
    meeting_id: int,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    query = _scope(db.query(Meeting), x_user_id)
    meeting = query.filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    result = _meeting_to_out(meeting)
    result["transcript_lines"] = [
        {
            "id": tl.id,
            "meeting_id": tl.meeting_id,
            "speaker": tl.speaker,
            "text": tl.text,
            "start_time": tl.start_time,
            "end_time": tl.end_time,
        }
        for tl in (meeting.transcript_lines or [])
    ]

    if meeting.summary:
        result["summary"] = {
            "id": meeting.summary.id,
            "meeting_id": meeting.summary.meeting_id,
            "overview": meeting.summary.overview,
            "key_topics": json.loads(meeting.summary.key_topics) if meeting.summary.key_topics else [],
            "chapters": json.loads(meeting.summary.chapters) if meeting.summary.chapters else [],
            "created_at": meeting.summary.created_at,
            "updated_at": meeting.summary.updated_at,
        }
    else:
        result["summary"] = None

    return result


@router.post("", response_model=dict, status_code=201)
def create_meeting(
    meeting_data: MeetingCreate,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    # Demo users cannot create meetings that persist — they go into demo space.
    # Auth'd users get their own row.
    meeting = Meeting(
        user_id=x_user_id if x_user_id else None,
        title=meeting_data.title,
        date=meeting_data.date,
        duration_seconds=meeting_data.duration_seconds,
        host=meeting_data.host,
        participants=json.dumps(meeting_data.participants),
        status=meeting_data.status,
        audio_url=meeting_data.audio_url,
        thumbnail_color=meeting_data.thumbnail_color,
        channel=meeting_data.channel,
    )
    db.add(meeting)
    db.flush()

    if meeting_data.transcript_text:
        lines = _parse_transcript_text(meeting_data.transcript_text, meeting.id)
        for line in lines:
            db.add(line)

    db.commit()
    db.refresh(meeting)
    return _meeting_to_out(meeting)


@router.put("/{meeting_id}", response_model=dict)
def update_meeting(
    meeting_id: int,
    update_data: MeetingUpdate,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    query = _scope(db.query(Meeting), x_user_id)
    meeting = query.filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if update_data.title is not None:
        meeting.title = update_data.title
    if update_data.date is not None:
        meeting.date = update_data.date
    if update_data.duration_seconds is not None:
        meeting.duration_seconds = update_data.duration_seconds
    if update_data.host is not None:
        meeting.host = update_data.host
    if update_data.participants is not None:
        meeting.participants = json.dumps(update_data.participants)
    if update_data.status is not None:
        meeting.status = update_data.status
    if update_data.channel is not None:
        meeting.channel = update_data.channel

    meeting.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(meeting)
    return _meeting_to_out(meeting)


@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(
    meeting_id: int,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    query = _scope(db.query(Meeting), x_user_id)
    meeting = query.filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    db.delete(meeting)
    db.commit()


@router.post("/{meeting_id}/transcript/upload")
async def upload_transcript(
    meeting_id: int,
    file: UploadFile = File(...),
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    query = _scope(db.query(Meeting), x_user_id)
    meeting = query.filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    content = await file.read()
    text = content.decode("utf-8", errors="ignore")

    db.query(TranscriptLine).filter(TranscriptLine.meeting_id == meeting_id).delete()
    lines = _parse_transcript_text(text, meeting_id)
    for line in lines:
        db.add(line)

    db.commit()
    return {"message": f"Uploaded {len(lines)} transcript lines", "count": len(lines)}


def _parse_transcript_text(text: str, meeting_id: int) -> List[TranscriptLine]:
    import re
    lines = []
    current_time = 0.0

    for raw_line in text.strip().splitlines():
        raw_line = raw_line.strip()
        if not raw_line:
            continue

        m = re.match(r"^\[(\d+):(\d+)(?::(\d+))?\]\s*([^:]+):\s*(.+)$", raw_line)
        if m:
            groups = m.groups()
            if groups[2]:
                start = int(groups[0]) * 3600 + int(groups[1]) * 60 + float(groups[2])
            else:
                start = int(groups[0]) * 60 + float(groups[1])
            speaker = groups[3].strip()
            text_content = groups[4].strip()
            lines.append(TranscriptLine(
                meeting_id=meeting_id, speaker=speaker, text=text_content,
                start_time=start, end_time=start + 10.0
            ))
            current_time = start + 10.0
            continue

        m = re.match(r"^([A-Z][^:]{2,40}):\s*(.+)$", raw_line)
        if m:
            speaker = m.group(1).strip()
            text_content = m.group(2).strip()
            lines.append(TranscriptLine(
                meeting_id=meeting_id, speaker=speaker, text=text_content,
                start_time=current_time, end_time=current_time + 10.0
            ))
            current_time += 10.0

    return lines
