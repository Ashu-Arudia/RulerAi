#  RulerAI — Next-Gen AI Meeting Intelligence Platform

> **RulerAI** is a high-fidelity, full-stack AI meeting assistant platform inspired by Fireflies.ai. Built with Next.js 15, FastAPI, and Groq LLM, RulerAI transforms unstructured meeting recordings and raw text transcripts into structured summaries, key topics, chapters, and actionable tasks — powered by AskFred AI chat, obsidian dark mode, multi-format exports, and user-isolated workspaces.

---

##  Features & Capabilities

-  **AskFred AI Assistant**: Context-aware meeting Q&A powered by Groq LLM (`llama-3.3-70b-versatile`). Ask about specific speakers (e.g., *"What did Rachel discuss?"*), decisions, action items, or risks.
-  **Any-Format AI Transcript Cleaning**: Upload raw, unstructured text from Zoom, Teams, Meet, Slack, or audio notes. Groq LLM automatically parses speakers, dialogue, and timestamps.
-  **User Data Isolation & Authentication**: Google OAuth (NextAuth.js) + per-user database scoping via `X-User-Id` headers. Dedicated `/home` workspace for logged-in users and isolated `/demo` environment.
-  **Obsidian Black Dark Mode**: Curated dark theme palette (`#09090b` obsidian background) with seamless contrast tooltips and instant theme toggling.
-  **Multi-Format Export**: Export meeting notes, summaries, action items, and transcripts directly to **PDF**, **Markdown (`.md`)**, or **Plain Text (`.txt`)**.
-  **Tags, Topics & Global Search**: Filter meetings by tags, channel, or topic chips. Perform instant global regex search across all meeting transcripts in your workspace.
-  **Interactive Media Player & Transcript Sync**: Bidirectional sync between audio player timeline, chapter outlines, and color-coded transcript lines.
-  **1-Click Cloud Deployment**: Production-ready configurations for **Render / Railway / Docker** backend and **Vercel** frontend.

---

##  Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | Next.js 15 (App Router, TypeScript) | High-performance React framework with server & client components |
| **Authentication** | NextAuth.js | Google OAuth 2.0 with JWT session persistence |
| **Styling** | Vanilla CSS + Design System | Custom CSS tokens, glassmorphism, obsidian dark theme |
| **Backend** | Python FastAPI | Asynchronous REST API with Pydantic validation |
| **LLM Engine** | Groq API (`llama-3.3-70b-versatile`) | Real-time transcript extraction, meeting summaries, and AskFred Q&A |
| **Database** | SQLAlchemy ORM | Dual SQLite (`fireflies.db`) & PostgreSQL production support |
| **Deployment** | Render, Docker, Vercel | `render.yaml`, `Procfile`, `Dockerfile`, `runtime.txt` |

---

##  Architecture Overview

```text
ScalerAi/
├── backend/
│   ├── main.py              # FastAPI application, CORS policy, router mounting
│   ├── database.py          # SQLAlchemy models, SQLite & PostgreSQL engine factory
│   ├── seed_data.py         # Seed demo data with 5 complete meeting records
│   ├── runtime.txt          # Python 3.11.9 runtime for Render / Heroku
│   ├── Procfile             # Process execution file for production web workers
│   ├── render.yaml          # Render blueprint specification
│   ├── Dockerfile           # Multi-stage production container build
│   ├── .env.example         # Environment variable template
│   └── routers/
│       ├── meetings.py      # CRUD + transcript upload endpoints
│       ├── llm.py           # /clean, /chat (AskFred), /samples
│       ├── transcripts.py   # Transcript detail + global search
│       ├── summaries.py     # Summary overview, topics, chapters
│       ├── action_items.py  # Action item tracking
│       └── users.py         # User account scoping
│
└── frontend/
    ├── .env.example         # Vercel environment variable template
    └── src/
        ├── app/
        │   ├── layout.tsx              # Root layout & providers
        │   ├── (landing)/page.tsx      # High-converting landing page
        │   ├── (app)/home/page.tsx     # Authenticated user dashboard (/home)
        │   ├── (app)/meetings/[id]/... # Meeting detail split-pane view
        │   ├── (app)/askfred/page.tsx  # Workspace-wide AskFred chat
        │   └── demo/...                # Isolated demo workspace routes
        ├── components/
        │   ├── layout/                 # Navigation, sidebar, dual-pane headers
        │   ├── meetings/               # AskFredChat, CreateMeetingModal, ExportModal
        │   └── demo/                   # Guided interactive feature tour
        └── lib/
            ├── api.ts                  # Fetch API wrapper with X-User-Id header support
            ├── auth.ts                 # NextAuth Google provider setup
            └── types.ts                # TypeScript interface definitions
```

---

##  Database Schema

```sql
-- users: authenticated Google accounts
CREATE TABLE users (
    id          INTEGER PRIMARY KEY,
    google_id   VARCHAR(100) UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255),
    image       TEXT,
    created_at  DATETIME
);

-- meetings: core meeting metadata (scoped to user_id)
CREATE TABLE meetings (
    id               INTEGER PRIMARY KEY,
    user_id          VARCHAR(100) REFERENCES users(google_id),
    title            TEXT NOT NULL,
    date             DATETIME NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    host             TEXT NOT NULL,
    participants     TEXT DEFAULT '[]',     -- JSON array of names
    status           TEXT DEFAULT 'completed',
    audio_url        TEXT,
    thumbnail_color  TEXT DEFAULT '#6938ef',
    channel          TEXT DEFAULT 'My Meetings',
    created_at       DATETIME,
    updated_at       DATETIME
);

-- transcript_lines: per-line dialogue with timestamps
CREATE TABLE transcript_lines (
    id          INTEGER PRIMARY KEY,
    meeting_id  INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
    speaker     TEXT NOT NULL,
    text        TEXT NOT NULL,
    start_time  REAL NOT NULL,
    end_time    REAL NOT NULL
);

-- summaries: AI meeting executive summary & outline
CREATE TABLE summaries (
    id          INTEGER PRIMARY KEY,
    meeting_id  INTEGER UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
    overview    TEXT NOT NULL,
    key_topics  TEXT DEFAULT '[]',   -- JSON array of topic strings
    chapters    TEXT DEFAULT '[]'    -- JSON array of timestamped chapters
);

-- action_items: extracted action items and assignees
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
```

---

##  API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check endpoint |
| `GET` | `/meetings` | List meetings (supports `user_id` scope, search, channel, sort) |
| `POST` | `/meetings` | Create meeting record |
| `GET` | `/meetings/{id}` | Get full meeting detail with transcript, summary, and action items |
| `DELETE` | `/meetings/{id}` | Delete meeting and all child records |
| `POST` | `/transcripts/clean` | AI transcript extraction & speaker parsing (Groq LLM) |
| `POST` | `/transcripts/chat` | AskFred AI chat Q&A endpoint |
| `GET` | `/transcripts/search/global?q=...` | Global transcript search across workspace |
| `GET` | `/summaries/{meeting_id}` | Retrieve AI meeting summary |
| `PUT` | `/summaries/{meeting_id}` | Update meeting summary overview or topics |
| `GET` | `/action-items/meeting/{meeting_id}` | List action items for a meeting |
| `POST` | `/action-items/meeting/{meeting_id}` | Create new action item |
| `PUT` | `/action-items/{id}` | Toggle completion status or edit action item |

Interactive Swagger documentation is available at: **`http://localhost:8000/docs`**

---

##  Quick Start Guide

### Prerequisites
- **Node.js** 18+ & **npm**
- **Python** 3.10+

### 1. Backend Setup (FastAPI)

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start local server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
The backend automatically initializes `fireflies.db` and seeds 5 demo meetings on startup.

### 2. Frontend Setup (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **`http://localhost:3000`** in your browser.

---

##  Cloud Deployment Guide

### Deploy Backend to Render

1. Create a **New Web Service** on Render connected to your repository.
2. Select root directory `/backend`.
3. Set **Build Command**:
   ```bash
   python -m pip install --upgrade pip setuptools wheel && pip install -r requirements.txt
   ```
4. Set **Start Command**:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
5. Add Environment Variables:
   - `GROQ_API_KEY`: *(Your Groq API Key)*
   - `FRONTEND_URL`: `https://your-app.vercel.app`
   - `PYTHON_VERSION`: `3.11.9`

### Deploy Frontend to Vercel

1. Import your project into **Vercel**.
2. Select root directory `/frontend`.
3. Configure Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://your-backend.onrender.com` *(No trailing slash)*
   - `NEXTAUTH_URL`: `https://your-app.vercel.app`
   - `NEXTAUTH_SECRET`: *(Random 32-character string)*
   - `GOOGLE_CLIENT_ID`: *(From Google Cloud Console)*
   - `GOOGLE_CLIENT_SECRET`: *(From Google Cloud Console)*
4. Click **Deploy**.

---

##  License

Distributed under the MIT License. See `LICENSE` for details.
