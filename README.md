# Fireflies.ai Clone — Meeting Notes & Transcription Platform

A full-stack clone of the Fireflies.ai meeting-assistant platform, built as part of the SDE Fullstack Assignment. Features a pixel-faithful recreation of the Fireflies workspace experience with interactive transcripts, AI summaries, action items, and full CRUD meeting management.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **Python** 3.10+
- **npm**

### 1. Backend Setup

```bash
cd backend
pip install fastapi uvicorn sqlalchemy python-multipart aiofiles python-dotenv pydantic
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will automatically:
- Create the SQLite database (`fireflies.db`)
- Seed 5 complete demo meetings with transcripts, summaries, and action items

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** — you'll be redirected to the meetings library.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router, TypeScript) |
| **Styling** | Vanilla CSS (custom design system) |
| **Backend** | Python FastAPI |
| **Database** | SQLite via SQLAlchemy ORM |
| **Font** | Inter (Google Fonts) |

---

## 🏗 Architecture Overview

```
ScalerAi/
├── backend/
│   ├── main.py              # FastAPI app, CORS, router mounting, startup seed
│   ├── database.py          # SQLAlchemy models, engine, session factory
│   ├── models.py            # Pydantic request/response models
│   ├── seed_data.py         # Demo data seeder (5 meetings with full content)
│   ├── routers/
│   │   ├── meetings.py      # CRUD + transcript upload endpoints
│   │   ├── transcripts.py   # Get transcript + global search
│   │   ├── summaries.py     # Get/update meeting summaries
│   │   └── action_items.py  # CRUD action items per meeting
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── app/
        │   ├── layout.tsx          # Root layout: sidebar + toast provider
        │   ├── page.tsx            # Redirect → /meetings
        │   ├── meetings/page.tsx   # Meetings library
        │   ├── meetings/[id]/page.tsx  # Meeting detail (split pane)
        │   ├── tasks/page.tsx      # Placeholder
        │   ├── analytics/page.tsx  # Placeholder
        │   ├── settings/page.tsx   # Settings placeholder
        │   ├── askfred/page.tsx    # Placeholder
        │   ├── ai-skills/page.tsx  # Placeholder
        │   └── integrations/page.tsx # Integrations placeholder
        ├── components/
        │   ├── layout/
        │   │   ├── Sidebar.tsx         # Icon nav sidebar (60px)
        │   │   └── MeetingsSidebar.tsx # Channel sub-sidebar (240px)
        │   ├── meetings/
        │   │   └── CreateMeetingModal.tsx
        │   └── ui/
        │       └── ToastProvider.tsx   # Toast notification context
        └── lib/
            ├── api.ts      # All API fetch functions + utilities
            └── types.ts    # TypeScript interfaces
```

---

## 🗄 Database Schema

```sql
-- meetings: core meeting metadata
CREATE TABLE meetings (
    id              INTEGER PRIMARY KEY,
    title           TEXT NOT NULL,
    date            DATETIME NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    host            TEXT NOT NULL,
    participants    TEXT DEFAULT '[]',    -- JSON array of names
    status          TEXT DEFAULT 'completed',
    audio_url       TEXT,
    thumbnail_color TEXT DEFAULT '#6938ef',
    channel         TEXT DEFAULT 'My Meetings',
    created_at      DATETIME,
    updated_at      DATETIME
);

-- transcript_lines: per-line transcript with speaker + timestamps
CREATE TABLE transcript_lines (
    id          INTEGER PRIMARY KEY,
    meeting_id  INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
    speaker     TEXT NOT NULL,
    text        TEXT NOT NULL,
    start_time  REAL NOT NULL,  -- seconds
    end_time    REAL NOT NULL
);

-- summaries: AI-generated summary content (1:1 with meeting)
CREATE TABLE summaries (
    id          INTEGER PRIMARY KEY,
    meeting_id  INTEGER UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
    overview    TEXT NOT NULL,
    key_topics  TEXT DEFAULT '[]',  -- JSON array of strings
    chapters    TEXT DEFAULT '[]'   -- JSON array of {title, timestamp, description}
);

-- action_items: tasks extracted from meetings
CREATE TABLE action_items (
    id          INTEGER PRIMARY KEY,
    meeting_id  INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    assignee    TEXT,
    due_date    TEXT,
    completed   BOOLEAN DEFAULT 0,
    created_at  DATETIME,
    updated_at  DATETIME
);

-- meeting_tags: many tags per meeting
CREATE TABLE meeting_tags (
    id          INTEGER PRIMARY KEY,
    meeting_id  INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
    tag         TEXT NOT NULL
);
```

**Design choices:**
- Cascade deletes on all child tables (transcript, summary, action items, tags) when a meeting is deleted
- `participants` stored as JSON text in SQLite (no separate table needed given scope)
- `chapters` and `key_topics` stored as JSON in summary table for flexible structure
- `start_time`/`end_time` stored as REAL (float seconds) to support sub-second precision

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/meetings` | List meetings (search, channel, sort query params) |
| GET | `/meetings/{id}` | Full meeting with transcript, summary, action items |
| POST | `/meetings` | Create meeting (with optional transcript_text) |
| PUT | `/meetings/{id}` | Update meeting metadata |
| DELETE | `/meetings/{id}` | Delete meeting and all related data |
| POST | `/meetings/{id}/transcript/upload` | Upload .txt transcript file |
| GET | `/transcripts/{meeting_id}` | Get transcript lines for a meeting |
| GET | `/transcripts/search/global?q=...` | Search across all transcripts |
| GET | `/summaries/{meeting_id}` | Get AI summary for a meeting |
| PUT | `/summaries/{meeting_id}` | Update summary content |
| GET | `/action-items/meeting/{meeting_id}` | List action items for a meeting |
| POST | `/action-items/meeting/{meeting_id}` | Create an action item |
| PUT | `/action-items/{id}` | Update / complete an action item |
| DELETE | `/action-items/{id}` | Delete an action item |

Interactive API docs available at: **http://localhost:8000/docs**

---

## ✨ Core Features

### Meetings Library
- List of meetings with color blocks, title, date, duration, participant avatars, status badges
- Filter by channel (My Meetings, All Meetings, custom channels)
- Search by title/host/participants
- Sort by date, duration, or title
- Delete with confirmation popover

### Meeting Detail (Split Pane)
- **Left pane**: Notes panel + Audio Player
  - AI meeting summary (overview text)
  - Key topics as chips
  - Outline/chapters with clickable timestamps → seeks player
  - Action items with check/uncheck, add new, delete
- **Right pane**: Transcript / AskFred tabs
  - Full transcript with speaker labels, color-coded per speaker, timestamps
  - Clickable transcript line → seeks mock player
  - Player time progress → auto-scrolls and highlights active transcript line
  - Transcript search with keyword highlighting and match count

### Mock Audio Player
- Seek bar with click-to-seek
- Play/pause toggle
- ±15s skip buttons
- Time display (current / total)
- Linked bidirectionally with transcript highlighting

### Meeting CRUD
- Create: form with title, host, date, duration, participants, channel, color, optional transcript paste
- Edit: update title, host, participants via modal
- Delete: confirmation popover on hover

### Transcript Upload
- Paste transcript in create modal
- Supports `Speaker: Text` and `[MM:SS] Speaker: Text` formats

---

## 🎨 Design System

Faithful to the Fireflies color palette and layout:
- **Brand Purple**: `#6938ef`
- **Background**: `#f5f6fa`
- **Surface**: `#ffffff`
- **Dual sidebar**: 60px icon nav + 240px channel list
- **Font**: Inter (Google Fonts)

---

## 🌐 Mocked / Placeholder Sections

The following features are present as "Coming Soon" placeholders:
- AskFred AI chat (within meeting detail and global)
- AI Skills runner
- Real-time bot / speech-to-text
- Zoom / Google Meet / calendar integrations
- Analytics dashboard
- Team collaboration and sharing
- Real authentication (default user: Sarah Chen)

---

## 📦 Seed Data

Five rich demo meetings are seeded at startup:

| Meeting | Host | Duration | Participants | Actions |
|---|---|---|---|---|
| Q3 Product Roadmap Review | Sarah Chen | 45m | 8 | 6 |
| Sales Pipeline Weekly Sync | Marcus Johnson | 32m | 4 | 5 |
| Engineering Standup — Sprint 42 | James Okafor | 22m | 6 | 5 |
| Customer Success Interview — Horizon Analytics | Rachel Green | 55m | 3 | 4 |
| Marketing Campaign Brainstorm — Q4 Launch | Alex Rivera | 38m | 5 | 6 |

Each meeting includes 20-35 realistic transcript lines, a 4-section AI summary with chapters, and action items with assignees and due dates.

---

## 🔮 Assumptions

1. **No real authentication**: A default user (Sarah Chen) is assumed to be logged in.
2. **No actual audio**: The media player is a fully-functional seek/playback UI backed by a JavaScript timer, not a real audio file.
3. **Transcript formats**: The parser supports two formats; complex VTT is not implemented.
4. **SQLite**: Chosen for simplicity; the schema and queries are compatible with PostgreSQL with minimal changes.
5. **CORS**: Frontend dev server (`localhost:3000`) is whitelisted in CORS config.
