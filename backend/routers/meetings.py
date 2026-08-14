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


from routers.llm import generate_meeting_analysis


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

    # Auto-generate summary & action items if missing but transcript exists
    if not meeting.summary and meeting.transcript_lines:
        participants_list = json.loads(meeting.participants) if meeting.participants else []
        line_dicts = [
            {"speaker": tl.speaker, "text": tl.text, "start_time": tl.start_time, "end_time": tl.end_time}
            for tl in meeting.transcript_lines
        ]
        analysis = generate_meeting_analysis(meeting.title, participants_list, line_dicts)

        summary = Summary(
            meeting_id=meeting.id,
            overview=analysis["overview"],
            key_topics=json.dumps(analysis.get("key_topics", [])),
            chapters=json.dumps(analysis.get("chapters", [])),
        )
        db.add(summary)

        if not meeting.action_items:
            for ai in analysis.get("action_items", []):
                db.add(ActionItem(
                    meeting_id=meeting.id,
                    text=ai["text"],
                    assignee=ai.get("assignee"),
                    due_date=ai.get("due_date"),
                    completed=False
                ))

        db.commit()
        db.refresh(meeting)

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
        lines, speakers = _parse_transcript_text(meeting_data.transcript_text, meeting.id)
        for line in lines:
            db.add(line)
        # If participants were not explicitly provided, auto-fill from parsed speakers
        if speakers and (not meeting_data.participants or meeting_data.participants == ["Host"]):
            meeting.participants = json.dumps(sorted(list(speakers)))

        # Auto-generate Summary & Action Items
        participants_list = json.loads(meeting.participants) if meeting.participants else []
        line_dicts = [
            {"speaker": l.speaker, "text": l.text, "start_time": l.start_time, "end_time": l.end_time}
            for l in lines
        ]
        analysis = generate_meeting_analysis(meeting.title, participants_list, line_dicts)

        summary = Summary(
            meeting_id=meeting.id,
            overview=analysis["overview"],
            key_topics=json.dumps(analysis.get("key_topics", [])),
            chapters=json.dumps(analysis.get("chapters", [])),
        )
        db.add(summary)

        for ai in analysis.get("action_items", []):
            db.add(ActionItem(
                meeting_id=meeting.id,
                text=ai["text"],
                assignee=ai.get("assignee"),
                due_date=ai.get("due_date"),
                completed=False
            ))

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
    lines, speakers = _parse_transcript_text(text, meeting_id)
    for line in lines:
        db.add(line)

    if speakers:
        meeting.participants = json.dumps(sorted(list(speakers)))

    if lines:
        participants_list = json.loads(meeting.participants) if meeting.participants else []
        line_dicts = [
            {"speaker": l.speaker, "text": l.text, "start_time": l.start_time, "end_time": l.end_time}
            for l in lines
        ]
        analysis = generate_meeting_analysis(meeting.title, participants_list, line_dicts)

        if meeting.summary:
            meeting.summary.overview = analysis["overview"]
            meeting.summary.key_topics = json.dumps(analysis.get("key_topics", []))
            meeting.summary.chapters = json.dumps(analysis.get("chapters", []))
        else:
            summary = Summary(
                meeting_id=meeting.id,
                overview=analysis["overview"],
                key_topics=json.dumps(analysis.get("key_topics", [])),
                chapters=json.dumps(analysis.get("chapters", [])),
            )
            db.add(summary)

        db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).delete()
        for ai in analysis.get("action_items", []):
            db.add(ActionItem(
                meeting_id=meeting.id,
                text=ai["text"],
                assignee=ai.get("assignee"),
                due_date=ai.get("due_date"),
                completed=False
            ))

    db.commit()
    return {"message": f"Uploaded {len(lines)} transcript lines", "count": len(lines)}



def _parse_transcript_text(text: str, meeting_id: int):
    """
    Parses ANY transcript format (inline timestamps, speaker turns, dash formats, SRT, etc.)
    into structured database TranscriptLine models.
    """
    import re
    lines = []
    speakers = set()
    current_time = 0.0

    def add_line(spk: str, content: str, forced_start: Optional[float] = None):
        nonlocal current_time
        content = content.strip()
        spk = spk.strip()
        if not content:
            return
        start = forced_start if forced_start is not None else current_time
        words = len(content.split())
        duration = max(5.0, min(30.0, words / 2.3))
        end = start + duration
        current_time = end

        if spk not in {"Narrator", "Notes"}:
            speakers.add(spk)

        lines.append(TranscriptLine(
            meeting_id=meeting_id,
            speaker=spk,
            text=content,
            start_time=round(start, 1),
            end_time=round(end, 1),
        ))

    def parse_ts(g0, g1, g2) -> float:
        if g2:
            return int(g0) * 3600 + int(g1) * 60 + float(g2)
        return int(g0) * 60 + float(g1)

    # Strategy A: Check for Inline Timestamps with Speakers
    # Matches: "10:02 AM — Alex: text", "10:02 - Alex: text", "[00:12] Alex: text"
    inline_pattern = re.compile(
        r"(?:\[|\()?(?:(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*[AP]M)?)(?:\]|\))?\s*(?:[—\-–:]\s*|\s+)([A-Z][a-zA-Z\s\-\.]{1,30}):\s*",
        re.IGNORECASE
    )
    matches = list(inline_pattern.finditer(text))

    if len(matches) >= 2 or (len(matches) == 1 and matches[0].start() == 0):
        for i, m in enumerate(matches):
            g = m.groups()
            ts_val = parse_ts(g[0], g[1], g[2])
            spk = g[3].strip()
            start_pos = m.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            content = text[start_pos:end_pos].strip()
            add_line(spk, content, forced_start=ts_val)
        if lines:
            return lines, speakers

    # Strategy B: Line-by-Line Parsing
    raw_lines = [l.strip() for l in text.splitlines() if l.strip()]

    pattern_ts_speaker = re.compile(r"^\[(\d+):(\d+)(?::(\d+))?\]\s*([^:\[\]]{2,40}):\s*(.+)$")
    pattern_paren_ts = re.compile(r"^\((\d+):(\d+)(?::(\d+))?\)\s*([^:\(\)]{2,40}):\s*(.+)$")
    pattern_bare_ts = re.compile(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?\s+([^:\d]{2,40}):\s*(.+)$")
    pattern_dash_ts = re.compile(r"^\d{1,2}:\d{2}(?:\s*[AP]M)?\s*[—\-–]\s*([^:]+):\s*(.+)$", re.IGNORECASE)
    pattern_slack = re.compile(r"^([^:\[\]]{2,40})\s*\[\d{1,2}:\d{2}(?:\s*[AP]M)?\]:\s*(.+)$", re.IGNORECASE)
    pattern_speaker = re.compile(r"^([A-Z][a-zA-Z\s\-\.]{1,35}[a-zA-Z]):\s*(.+)$")
    pattern_bullet = re.compile(r"^(?:\d+[\.\)]\s*|-\s*|\*\s*|•\s*)(.+)$")
    pattern_srt_ts = re.compile(r"^\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}$")

    matched_any = False

    for raw in raw_lines:
        if pattern_srt_ts.match(raw) or re.match(r"^\d+$", raw):
            continue

        m = pattern_ts_speaker.match(raw)
        if m:
            ts = parse_ts(m.group(1), m.group(2), m.group(3))
            add_line(m.group(4), m.group(5), forced_start=ts)
            matched_any = True
            continue

        m = pattern_paren_ts.match(raw)
        if m:
            ts = parse_ts(m.group(1), m.group(2), m.group(3))
            add_line(m.group(4), m.group(5), forced_start=ts)
            matched_any = True
            continue

        m = pattern_bare_ts.match(raw)
        if m:
            ts = parse_ts(m.group(1), m.group(2), m.group(3))
            add_line(m.group(4), m.group(5), forced_start=ts)
            matched_any = True
            continue

        m = pattern_dash_ts.match(raw)
        if m:
            add_line(m.group(1), m.group(2))
            matched_any = True
            continue

        m = pattern_slack.match(raw)
        if m:
            add_line(m.group(1), m.group(2))
            matched_any = True
            continue

        m = pattern_speaker.match(raw)
        if m:
            add_line(m.group(1), m.group(2))
            matched_any = True
            continue

        m = pattern_bullet.match(raw)
        if m:
            add_line("Notes", m.group(1))
            matched_any = True
            continue

        if matched_any and lines:
            lines[-1].text += " " + raw
            lines[-1].end_time += 3.0
            current_time = lines[-1].end_time
        else:
            add_line("Narrator", raw)
            matched_any = True

    # Strategy C: Paragraph/Sentence Splitter
    if not lines:
        sentences = re.split(r"(?<=[.!?])\s+", text)
        for i in range(0, len(sentences), 3):
            chunk = " ".join(sentences[i:i+3]).strip()
            if chunk:
                add_line("Narrator", chunk)

    return lines, speakers

