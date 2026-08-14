import json
import os
import re
from typing import List, Optional, Union
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, Meeting, TranscriptLine, Summary

router = APIRouter(prefix="/transcripts", tags=["llm"])

# ─── Default Transcripts ──────────────────────────────────────────────────────

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "transcripts")

SAMPLE_TRANSCRIPTS = [
    {
        "id": "product_review",
        "title": "Q3 Product Review",
        "description": "Product team reviews dashboard metrics and plans AI roadmap for Q4.",
        "duration": "3m 19s",
        "participants": ["Sarah Chen", "Marcus Rodriguez", "Lisa Park", "David Kim"],
        "filename": "product_review.txt",
    },
    {
        "id": "engineering_sync",
        "title": "Engineering Stand-up",
        "description": "Daily engineering sync covering sprint progress, blockers, and bug fixes.",
        "duration": "2m 36s",
        "participants": ["Alex Turner", "Priya Nair", "Jordan Wells", "Amir Saidi"],
        "filename": "engineering_sync.txt",
    },
    {
        "id": "sales_call",
        "title": "Enterprise Sales Call",
        "description": "175-seat enterprise deal — compliance, integrations, pricing, and next steps.",
        "duration": "3m 28s",
        "participants": ["Rachel Kim", "Tom Bradley"],
        "filename": "sales_call.txt",
    },
]


@router.get("/samples")
def list_sample_transcripts():
    """Return metadata for bundled sample transcripts."""
    return SAMPLE_TRANSCRIPTS


@router.get("/samples/{sample_id}")
def get_sample_transcript(sample_id: str):
    """Return the raw text content of a sample transcript."""
    sample = next((s for s in SAMPLE_TRANSCRIPTS if s["id"] == sample_id), None)
    if not sample:
        raise HTTPException(status_code=404, detail="Sample transcript not found")

    filepath = os.path.join(STATIC_DIR, sample["filename"])
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        return {"id": sample_id, "title": sample["title"], "content": content, **sample}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Transcript file not found on server")


# ─── LLM Cleaning Endpoint ────────────────────────────────────────────────────

class CleanRequest(BaseModel):
    raw_text: str


class CleanedLine(BaseModel):
    speaker: str
    text: str
    start_time: float
    end_time: float


class CleanResponse(BaseModel):
    cleaned_lines: List[CleanedLine]
    summary_hint: str
    participant_names: List[str]


GROQ_SYSTEM_PROMPT = """You are an expert meeting transcript extractor and cleaner.

Your job is to take ANY kind of raw text — no matter the format — and convert it into a clean, structured transcript.

INPUT FORMATS you must handle (user can paste anything):
- Timestamped: "[00:05] John: Hello everyone"
- Speaker-colon: "John: Hello everyone"
- Numbered: "1. John said hello to the team"
- Bullet points: "- Sarah mentioned the Q3 targets"
- Paragraph narrative: "John opened the meeting by welcoming everyone. Sarah then discussed the roadmap."
- Mixed paragraphs with speaker mentions
- Messy auto-generated captions with no formatting
- WhatsApp/Slack export style: "John Smith [10:32 AM]: Can we move the deadline?"
- Email thread style: "From: John\nSubject: Re: Meeting notes\nI think we should..."
- Raw unstructured notes: "discussed budget. john said increase by 10%. sarah disagreed."
- SRT/VTT subtitle formats
- ANY other format

YOUR STRICT RULES:
1. ALWAYS produce output — never return an empty cleaned_lines array
2. If you cannot identify distinct speakers, use "Speaker 1", "Speaker 2", etc., or "Narrator" for narrative text
3. If no timestamps exist, assign sequential timestamps starting at 0, adding 8-15 seconds per line based on text length
4. Remove filler words (um, uh, like, you know, sort of, basically, literally) while preserving meaning
5. Fix grammar and improve sentence clarity
6. Merge very short consecutive lines from the same speaker into one line
7. Split very long monologues (>200 words) into natural segments
8. Extract ALL meaningful content — do not skip any segment

Return ONLY valid JSON (no markdown, no backticks, no explanation text), using this exact schema:
{
  "cleaned_lines": [
    {"speaker": "Name", "text": "Cleaned sentence.", "start_time": 0.0, "end_time": 12.0}
  ],
  "summary_hint": "One concise sentence describing what this meeting/conversation was about.",
  "participant_names": ["Name1", "Name2"]
}

CRITICAL: You MUST always return at least one entry in cleaned_lines, even if the input is just a single paragraph of text."""


def _smart_fallback_parse(text: str) -> CleanResponse:
    """
    Multi-strategy fallback parser that handles many formats without the LLM.
    Tries strategies in order of specificity, falling back to treating the whole
    document as narration if no speaker patterns are found.
    """
    lines_out = []
    speakers: set = set()
    current_time = 0.0

    def add_line(speaker: str, content: str) -> None:
        nonlocal current_time
        if not content.strip():
            return
        # Estimate duration from word count (~140 wpm average)
        words = len(content.split())
        duration = max(5.0, min(30.0, words / 2.3))
        speakers.add(speaker)
        lines_out.append(CleanedLine(
            speaker=speaker,
            text=content.strip(),
            start_time=round(current_time, 1),
            end_time=round(current_time + duration, 1)
        ))
        current_time += duration

    raw_lines = [l.strip() for l in text.strip().splitlines()]

    # ── Strategy 1: [HH:MM:SS] or [MM:SS] with Speaker: text ──────────────────
    pattern_ts_speaker = re.compile(
        r"^\[(\d+):(\d+)(?::(\d+))?\]\s*([^:\[\]]{2,40}):\s*(.+)$"
    )
    # ── Strategy 2: (HH:MM:SS) or (MM:SS) Speaker: text ──────────────────────
    pattern_paren_ts = re.compile(
        r"^\((\d+):(\d+)(?::(\d+))?\)\s*([^:\(\)]{2,40}):\s*(.+)$"
    )
    # ── Strategy 3: HH:MM:SS  Speaker: text (bare timestamp) ─────────────────
    pattern_bare_ts = re.compile(
        r"^(\d{1,2}):(\d{2})(?::(\d{2}))?\s+([^:\d]{2,40}):\s*(.+)$"
    )
    # ── Strategy 4: SRT/VTT  00:00:00,000 --> 00:00:05,000 ───────────────────
    pattern_srt_ts = re.compile(r"^\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}$")
    # ── Strategy 5: Slack/WhatsApp  Name [HH:MM AM/PM]: text ─────────────────
    pattern_slack = re.compile(
        r"^([^:\[\]]{2,40})\s*\[\d{1,2}:\d{2}(?:\s*[AP]M)?\]:\s*(.+)$", re.IGNORECASE
    )
    # ── Strategy 6: Plain "Speaker: text" ─────────────────────────────────────
    pattern_speaker = re.compile(r"^([A-Z][a-zA-Z\s\-\.]{1,35}[a-zA-Z]):\s*(.+)$")
    # ── Strategy 7: Numbered list "1. text" or "- text" ──────────────────────
    pattern_bullet = re.compile(r"^(?:\d+[\.\)]\s*|-\s*|\*\s*|•\s*)(.+)$")

    def parse_ts(g0, g1, g2) -> float:
        if g2:
            return int(g0) * 3600 + int(g1) * 60 + float(g2)
        return int(g0) * 60 + float(g1)

    # ── Strategy 0: Check for Inline Timestamps with Speakers ─────────────────
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
            add_line(spk, content)
        if lines_out:
            return CleanResponse(
                cleaned_lines=lines_out,
                summary_hint="Transcript parsed locally — add your GROQ_API_KEY for AI-powered cleaning.",
                participant_names=sorted(list(speakers - {"Narrator", "Notes"})),
            )

    raw_lines = [l.strip() for l in text.strip().splitlines()]

    # ── Strategy 1: [HH:MM:SS] or [MM:SS] with Speaker: text ──────────────────
    pattern_ts_speaker = re.compile(
        r"^\[(\d+):(\d+)(?::(\d+))?\]\s*([^:\[\]]{2,40}):\s*(.+)$"
    )
    # ── Strategy 2: (HH:MM:SS) or (MM:SS) Speaker: text ──────────────────────
    pattern_paren_ts = re.compile(
        r"^\((\d+):(\d+)(?::(\d+))?\)\s*([^:\(\)]{2,40}):\s*(.+)$"
    )
    # ── Strategy 3: HH:MM:SS Speaker: text (bare timestamp) ─────────────────
    pattern_bare_ts = re.compile(
        r"^(\d{1,2}):(\d{2})(?::(\d{2}))?\s+([^:\d]{2,40}):\s*(.+)$"
    )
    # ── Strategy 4: 10:02 AM — Speaker: text ──────────────────────────────────
    pattern_dash_ts = re.compile(
        r"^\d{1,2}:\d{2}(?:\s*[AP]M)?\s*[—\-–]\s*([^:]+):\s*(.+)$", re.IGNORECASE
    )
    # ── Strategy 5: SRT/VTT 00:00:00,000 --> 00:00:05,000 ───────────────────
    pattern_srt_ts = re.compile(r"^\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}$")
    # ── Strategy 6: Slack/WhatsApp Name [HH:MM AM/PM]: text ─────────────────
    pattern_slack = re.compile(
        r"^([^:\[\]]{2,40})\s*\[\d{1,2}:\d{2}(?:\s*[AP]M)?\]:\s*(.+)$", re.IGNORECASE
    )
    # ── Strategy 7: Plain "Speaker: text" ─────────────────────────────────────
    pattern_speaker = re.compile(r"^([A-Z][a-zA-Z\s\-\.]{1,35}[a-zA-Z]):\s*(.+)$")
    # ── Strategy 8: Numbered list "1. text" or "- text" ──────────────────────
    pattern_bullet = re.compile(r"^(?:\d+[\.\)]\s*|-\s*|\*\s*|•\s*)(.+)$")

    matched_any = False
    srt_skip_next = False

    for raw in raw_lines:
        if not raw:
            continue

        if srt_skip_next:
            srt_skip_next = False
            continue

        # Strategy 1 — [timestamp] speaker: text
        m = pattern_ts_speaker.match(raw)
        if m:
            current_time = parse_ts(m.group(1), m.group(2), m.group(3))
            add_line(m.group(4).strip(), m.group(5).strip())
            matched_any = True
            continue

        # Strategy 2 — (timestamp) speaker: text
        m = pattern_paren_ts.match(raw)
        if m:
            current_time = parse_ts(m.group(1), m.group(2), m.group(3))
            add_line(m.group(4).strip(), m.group(5).strip())
            matched_any = True
            continue

        # Strategy 3 — bare HH:MM speaker: text
        m = pattern_bare_ts.match(raw)
        if m:
            current_time = parse_ts(m.group(1), m.group(2), m.group(3))
            add_line(m.group(4).strip(), m.group(5).strip())
            matched_any = True
            continue

        # Strategy 4 — 10:02 AM — Speaker: text
        m = pattern_dash_ts.match(raw)
        if m:
            add_line(m.group(1).strip(), m.group(2).strip())
            matched_any = True
            continue

        # Strategy 5 — SRT timestamp line — skip the ts row
        if pattern_srt_ts.match(raw):
            srt_skip_next = False
            continue

        # Skip pure SRT index numbers
        if re.match(r"^\d+$", raw):
            continue

        # Strategy 6 — Slack/WhatsApp style
        m = pattern_slack.match(raw)
        if m:
            add_line(m.group(1).strip(), m.group(2).strip())
            matched_any = True
            continue

        # Strategy 7 — "Speaker: text"
        m = pattern_speaker.match(raw)
        if m:
            add_line(m.group(1).strip(), m.group(2).strip())
            matched_any = True
            continue

        # Strategy 8 — bullets/numbered lists (treat as generic notes)
        m = pattern_bullet.match(raw)
        if m:
            add_line("Notes", m.group(1).strip())
            matched_any = True
            continue

        # Unmatched non-empty line — attach to last speaker or "Narrator"
        if raw and matched_any and lines_out:
            # Extend the last line's text
            lines_out[-1] = CleanedLine(
                speaker=lines_out[-1].speaker,
                text=lines_out[-1].text + " " + raw,
                start_time=lines_out[-1].start_time,
                end_time=lines_out[-1].end_time + 3.0,
            )
            current_time = lines_out[-1].end_time
        elif raw:
            # Pure narrative/paragraph — wrap as narrator
            add_line("Narrator", raw)
            matched_any = True

    # ── Strategy C: paragraph-level fallback — split on sentences if nothing matched ──
    if not lines_out:
        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        for i in range(0, len(sentences), 3):
            chunk = " ".join(sentences[i:i+3]).strip()
            if chunk:
                add_line("Narrator", chunk)

    return CleanResponse(
        cleaned_lines=lines_out,
        summary_hint="Transcript parsed locally — add your GROQ_API_KEY for AI-powered cleaning.",
        participant_names=sorted(list(speakers - {"Narrator", "Notes"})),
    )


@router.post("/clean", response_model=CleanResponse)
async def clean_transcript(req: CleanRequest):
    """Use LLM (Groq) to clean and structure raw transcript text of ANY format."""
    if not req.raw_text.strip():
        raise HTTPException(status_code=400, detail="raw_text is required")

    raw_text = req.raw_text[:15000]  # Slightly larger limit for flexibility

    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if api_key and api_key != "your_groq_api_key_here":
        try:
            from groq import Groq
            # Try primary active Groq model, falling back to instant/legacy models
            models_to_try = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192"]
            chat_completion = None

            for model_name in models_to_try:
                try:
                    chat_completion = client.chat.completions.create(
                        messages=[
                            {"role": "system", "content": GROQ_SYSTEM_PROMPT},
                            {
                                "role": "user",
                                "content": (
                                    "Extract and clean this transcript. "
                                    "It may be in any format — do your best to identify speakers and dialogue.\n\n"
                                    f"{raw_text}"
                                ),
                            },
                        ],
                        model=model_name,
                        temperature=0.15,
                        max_tokens=6000,
                    )
                    if chat_completion and chat_completion.choices:
                        break
                except Exception:
                    continue

            if not chat_completion:
                return _smart_fallback_parse(raw_text)

            result_text = chat_completion.choices[0].message.content.strip()

            # Strip any accidental markdown fences
            if result_text.startswith("```"):
                result_text = re.sub(r"^```[a-z]*\n?", "", result_text)
                result_text = re.sub(r"\n?```$", "", result_text).strip()

            try:
                data = json.loads(result_text)
                cleaned_lines = [
                    CleanedLine(
                        speaker=str(line.get("speaker", "Speaker")).strip() or "Speaker",
                        text=str(line.get("text", "")).strip(),
                        start_time=float(line.get("start_time", 0)),
                        end_time=float(line.get("end_time", 10)),
                    )
                    for line in data.get("cleaned_lines", [])
                    if str(line.get("text", "")).strip()
                ]

                if cleaned_lines:
                    return CleanResponse(
                        cleaned_lines=cleaned_lines,
                        summary_hint=str(data.get("summary_hint", "")),
                        participant_names=[str(n) for n in data.get("participant_names", [])],
                    )
                # LLM returned empty — fall through to smart fallback
            except (json.JSONDecodeError, KeyError, TypeError, ValueError):
                pass  # Fall through to smart fallback

        except Exception:
            pass  # Groq unavailable — use smart fallback

    # Smart multi-strategy fallback
    return _smart_fallback_parse(raw_text)


def generate_meeting_analysis(title: str, participants: List[str], transcript_lines: List[dict]) -> dict:
    """
    Generates summary overview, key topics, outline chapters, and action items
    from meeting title, participants, and transcript lines.
    Uses Groq LLM if GROQ_API_KEY is available, or smart fallback heuristic otherwise.
    """
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if api_key and api_key != "your_groq_api_key_here":
        try:
            import httpx
            spk_str = ", ".join(participants) if participants else "Team"
            transcript_text = "\n".join([
                f"[{int(l.get('start_time', 0))//60:02d}:{int(l.get('start_time', 0))%60:02d}] {l.get('speaker', 'Speaker')}: {l.get('text', '')}"
                for l in transcript_lines
            ])

            prompt = f"""Analyze the following meeting transcript and extract structured JSON meeting notes.

Meeting Title: {title}
Participants: {spk_str}

Transcript:
{transcript_text[:5000]}

Return strictly valid JSON with this schema:
{{
  "overview": "A 2-3 sentence executive summary of key discussion points and outcomes.",
  "key_topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"],
  "chapters": [
    {{ "timestamp": 0, "title": "Chapter 1 Title", "description": "Brief description of topics discussed in this segment" }},
    {{ "timestamp": 30, "title": "Chapter 2 Title", "description": "Brief description of topics discussed in this segment" }}
  ],
  "action_items": [
    {{ "text": "Clear action item statement", "assignee": "Person Name or null", "due_date": "Tomorrow / Next Week / Date" }}
  ]
}}
"""

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            models_to_try = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192"]
            with httpx.Client(timeout=15.0) as client:
                for model_name in models_to_try:
                    try:
                        body = {
                            "model": model_name,
                            "messages": [
                                {"role": "system", "content": "You are an AI meeting intelligence system that outputs JSON only."},
                                {"role": "user", "content": prompt}
                            ],
                            "response_format": {"type": "json_object"},
                            "temperature": 0.3,
                        }
                        res = client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=body)
                        if res.status_code == 200:
                            content_str = res.json()["choices"][0]["message"]["content"]
                            parsed = json.loads(content_str)
                            if "overview" in parsed and "key_topics" in parsed and "chapters" in parsed:
                                return parsed
                    except Exception:
                        continue
        except Exception:
            pass  # Fall through to smart fallback generator

    return _fallback_meeting_analysis(title, participants, transcript_lines)


def _fallback_meeting_analysis(title: str, participants: List[str], transcript_lines: List[dict]) -> dict:
    """
    Generates intelligent summary, topics, chapters, and action items locally without an API key.
    """
    spk_names = [p for p in participants if p not in {"Narrator", "Notes"}]
    if not spk_names:
        spk_names = list({l.get("speaker") for l in transcript_lines if l.get("speaker") not in {"Narrator", "Notes"}})
    if not spk_names:
        spk_names = ["Team"]

    # 1. Overview
    all_text = " ".join([l.get("text", "") for l in transcript_lines])
    words = all_text.split()
    first_few = " ".join(words[:40]) if words else "The team held a sync."
    overview = f"During this {title} meeting, {', '.join(spk_names[:3])} aligned on key project updates, review milestones, and technical implementation details. {first_few}..."

    # 2. Key Topics
    candidates = []
    title_terms = [w.strip(":,.-") for w in title.split() if len(w) > 3 and w.lower() not in {"sync", "call", "review", "meeting"}]
    candidates.extend(title_terms)

    keywords = ["dashboard", "authentication", "api", "roadmap", "filters", "database", "ui/ux", "frontend", "backend", "analytics", "performance", "integration", "deployment", "sprint", "metrics", "compliance", "testing"]
    found_kw = [kw.capitalize() for kw in keywords if re.search(r'\b' + kw + r'\b', all_text, re.IGNORECASE)]
    candidates.extend(found_kw)

    cap_matches = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b', all_text)
    for cap in cap_matches:
        if cap not in spk_names and len(cap) < 30:
            candidates.append(cap)

    key_topics = []
    for c in candidates:
        if c not in key_topics and len(key_topics) < 5:
            key_topics.append(c)

    if not key_topics:
        key_topics = [f"{title} Strategy", "Sprint Progress", "Technical Alignment", "Next Steps"]

    # 3. Chapters / Outline
    chapters = []
    total_lines = len(transcript_lines)
    if total_lines == 0:
        chapters = [{"timestamp": 0, "title": "Meeting Start", "description": "Overview of meeting goals."}]
    elif total_lines <= 3:
        first_line = transcript_lines[0]
        chapters.append({
            "timestamp": round(first_line.get("start_time", 0)),
            "title": f"Discussion: {key_topics[0] if key_topics else title}",
            "description": first_line.get("text", "")[:120] + "..."
        })
    else:
        c1_idx = 0
        c2_idx = max(1, total_lines // 3)
        c3_idx = max(2, (2 * total_lines) // 3)

        indices = [("Introduction & Agenda", c1_idx), (f"Deep Dive: {key_topics[0]}", c2_idx), ("Action Plan & Wrap-up", c3_idx)]
        for label, idx in indices:
            if idx < total_lines:
                line = transcript_lines[idx]
                chapters.append({
                    "timestamp": round(line.get("start_time", 0)),
                    "title": label,
                    "description": line.get("text", "")[:120] + "..."
                })

    # 4. Action Items
    action_items = []
    action_triggers = re.compile(
        r'\b(?:i\'ll|i will|need to|should|working on|going to|will handle|assign|finish|complete|implement|fix)\b',
        re.IGNORECASE
    )

    for line in transcript_lines:
        text_content = line.get("text", "")
        spk = line.get("speaker", "")
        if action_triggers.search(text_content):
            cleaned_action = re.sub(r'^(?:well|so|yeah|yes|great|okay|thanks),?\s*', '', text_content, flags=re.IGNORECASE)
            assignee = spk if spk not in {"Narrator", "Notes"} else (spk_names[0] if spk_names else None)
            
            due = "Tomorrow"
            if re.search(r'next week', text_content, re.I):
                due = "Next Week"
            elif re.search(r'friday|end of week', text_content, re.I):
                due = "End of Week"

            action_items.append({
                "text": cleaned_action[:150],
                "assignee": assignee,
                "due_date": due
            })
            if len(action_items) >= 4:
                break

    if not action_items:
        for i, name in enumerate(spk_names[:2]):
            topic_ref = key_topics[i % len(key_topics)] if key_topics else "meeting deliverables"
            action_items.append({
                "text": f"Follow up on {topic_ref.lower()} implementation and report status",
                "assignee": name,
                "due_date": "Tomorrow" if i == 0 else "End of Week"
            })

    return {
        "overview": overview,
        "key_topics": key_topics,
        "chapters": chapters,
        "action_items": action_items
    }


class ChatRequest(BaseModel):
    query: str
    meeting_id: Optional[Union[int, str]] = None
    meeting_title: Optional[str] = None
    transcript_text: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    sources: Optional[List[str]] = []


@router.post("/chat", response_model=ChatResponse)
def ask_fred_chat(
    req: ChatRequest,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    query = req.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="query is required")

    transcript_context = ""
    meeting_title = req.meeting_title or "Current Working Meeting"

    # 1. Use client-provided transcript text if present
    if req.transcript_text and req.transcript_text.strip():
        transcript_context = req.transcript_text.strip()
    elif req.meeting_id:
        # 2. Try fetching from Database by ID
        try:
            m_id_int = int(req.meeting_id)
            m_query = db.query(Meeting).filter(Meeting.id == m_id_int)
            if x_user_id:
                m_query = m_query.filter(Meeting.user_id == x_user_id)
            else:
                m_query = m_query.filter(Meeting.user_id == None)  # noqa: E711
            meeting = m_query.first()

            if meeting:
                meeting_title = meeting.title
                lines = (
                    db.query(TranscriptLine)
                    .filter(TranscriptLine.meeting_id == meeting.id)
                    .order_by(TranscriptLine.start_time)
                    .all()
                )
                transcript_context = "\n".join([f"{l.speaker}: {l.text}" for l in lines])
        except (ValueError, TypeError):
            pass

    # 3. Fallback if context is still empty (e.g. demo meeting or global search)
    if not transcript_context.strip():
        m_query = db.query(Meeting)
        if x_user_id:
            m_query = m_query.filter(Meeting.user_id == x_user_id)
        else:
            m_query = m_query.filter(Meeting.user_id == None)  # noqa: E711
        meetings = m_query.limit(5).all()
        m_ids = [m.id for m in meetings]

        if m_ids:
            lines = (
                db.query(TranscriptLine)
                .filter(TranscriptLine.meeting_id.in_(m_ids))
                .limit(100)
                .all()
            )
            transcript_context = "\n".join([f"[{l.speaker}]: {l.text}" for l in lines])

        # If DB is empty, read static bundled transcript files
        if not transcript_context.strip():
            static_texts = []
            for sample in SAMPLE_TRANSCRIPTS:
                file_path = os.path.join(STATIC_DIR, sample["filename"])
                if os.path.exists(file_path):
                    with open(file_path, "r", encoding="utf-8") as f:
                        static_texts.append(f"[{sample['title']}]\n{f.read()}")
            transcript_context = "\n\n".join(static_texts)

    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if api_key and api_key != "your_groq_api_key_here":
        try:
            import httpx
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            prompt = f"""You are Fred, an AI meeting assistant. Answer the user's question accurately based on the transcript context provided below.

Context ({meeting_title}):
{transcript_context[:6000]}

User Question: {query}

Instructions:
- Provide a direct, concise, and helpful answer.
- If asked what a specific person (e.g., Rachel, Sarah, Alex) is talking about, highlight their exact points and discussion topics from the transcript.
- Do not invent facts not present in the transcript.
"""
            models_to_try = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192"]
            with httpx.Client(timeout=15.0) as client:
                for model_name in models_to_try:
                    try:
                        body = {
                            "model": model_name,
                            "messages": [
                                {"role": "system", "content": "You are Fred, an AI meeting assistant that answers questions based on meeting transcripts."},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.2,
                        }
                        res = client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=body)
                        if res.status_code == 200:
                            ans = res.json()["choices"][0]["message"]["content"].strip()
                            if ans:
                                return ChatResponse(answer=ans)
                    except Exception:
                        continue
        except Exception:
            pass

    # Intelligent Fallback matching
    q_words = [w.lower() for w in re.findall(r'\w+', query) if len(w) > 2]
    matching_lines = []
    
    # Check for speaker matches (e.g., "rachel")
    speaker_matches = []
    for line_text in transcript_context.splitlines():
        if ":" in line_text:
            spk, txt = line_text.split(":", 1)
            spk_lower = spk.lower()
            for qw in q_words:
                if qw in spk_lower:
                    speaker_matches.append(f"• **{spk.strip()}**: {txt.strip()}")
                elif qw in txt.lower():
                    matching_lines.append(f"• **{spk.strip()}**: {txt.strip()}")

    if speaker_matches:
        formatted = "\n".join(speaker_matches[:5])
        return ChatResponse(
            answer=f"Here is what **{q_words[0].capitalize()}** discussed in **{meeting_title}**:\n\n{formatted}"
        )
    elif matching_lines:
        formatted = "\n".join(matching_lines[:4])
        return ChatResponse(
            answer=f"Here are the relevant discussion points in **{meeting_title}** regarding your query:\n\n{formatted}"
        )

    return ChatResponse(
        answer=f"I checked the transcripts for **{meeting_title}**. Here is the key summary:\n\n{transcript_context[:300]}..."
    )



