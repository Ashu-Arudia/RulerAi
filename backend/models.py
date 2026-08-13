from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─── Transcript ──────────────────────────────────────────────────────────────

class TranscriptLineBase(BaseModel):
    speaker: str
    text: str
    start_time: float
    end_time: float

class TranscriptLineCreate(TranscriptLineBase):
    pass

class TranscriptLineOut(TranscriptLineBase):
    id: int
    meeting_id: int

    class Config:
        from_attributes = True


# ─── Summary ─────────────────────────────────────────────────────────────────

class SummaryBase(BaseModel):
    overview: str
    key_topics: List[str] = []
    chapters: List[dict] = []

class SummaryCreate(SummaryBase):
    pass

class SummaryUpdate(BaseModel):
    overview: Optional[str] = None
    key_topics: Optional[List[str]] = None
    chapters: Optional[List[dict]] = None

class SummaryOut(SummaryBase):
    id: int
    meeting_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Action Items ─────────────────────────────────────────────────────────────

class ActionItemBase(BaseModel):
    text: str
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    completed: bool = False

class ActionItemCreate(ActionItemBase):
    pass

class ActionItemUpdate(BaseModel):
    text: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    completed: Optional[bool] = None

class ActionItemOut(ActionItemBase):
    id: int
    meeting_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Meetings ────────────────────────────────────────────────────────────────

class MeetingBase(BaseModel):
    title: str
    date: datetime
    duration_seconds: int = 0
    host: str
    participants: List[str] = []
    status: str = "completed"
    audio_url: Optional[str] = None
    thumbnail_color: str = "#6938ef"
    channel: str = "My Meetings"

class MeetingCreate(MeetingBase):
    transcript_text: Optional[str] = None  # For pasting transcript

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    host: Optional[str] = None
    participants: Optional[List[str]] = None
    status: Optional[str] = None
    channel: Optional[str] = None

class MeetingOut(MeetingBase):
    id: int
    created_at: datetime
    updated_at: datetime
    action_items: List[ActionItemOut] = []
    tags: List[str] = []

    class Config:
        from_attributes = True

class MeetingDetailOut(MeetingOut):
    transcript_lines: List[TranscriptLineOut] = []
    summary: Optional[SummaryOut] = None

    class Config:
        from_attributes = True


# ─── Search ────────────────────────────────────────────────────────────────

class SearchResult(BaseModel):
    meeting_id: int
    meeting_title: str
    meeting_date: datetime
    transcript_line_id: int
    speaker: str
    text: str
    start_time: float
    context: str = ""
