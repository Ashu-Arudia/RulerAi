import json
import os
import re
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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

        # Strategy 3 — bare HH:MM  speaker: text
        m = pattern_bare_ts.match(raw)
        if m:
            current_time = parse_ts(m.group(1), m.group(2), m.group(3))
            add_line(m.group(4).strip(), m.group(5).strip())
            matched_any = True
            continue

        # Strategy 4 — SRT timestamp line — skip the ts row, collect next non-empty line
        if pattern_srt_ts.match(raw):
            srt_skip_next = False
            continue

        # Skip pure SRT index numbers
        if re.match(r"^\d+$", raw):
            continue

        # Strategy 5 — Slack/WhatsApp style
        m = pattern_slack.match(raw)
        if m:
            add_line(m.group(1).strip(), m.group(2).strip())
            matched_any = True
            continue

        # Strategy 6 — "Speaker: text"
        m = pattern_speaker.match(raw)
        if m:
            add_line(m.group(1).strip(), m.group(2).strip())
            matched_any = True
            continue

        # Strategy 7 — bullets/numbered lists (treat as generic notes)
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

    # ── Strategy 8: paragraph-level fallback — split on sentences if nothing matched ──
    if not lines_out:
        import textwrap
        # Split on sentence boundaries
        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        # Group into ~3-sentence chunks as "Narrator" entries
        for i in range(0, len(sentences), 3):
            chunk = " ".join(sentences[i:i+3]).strip()
            if chunk:
                add_line("Narrator", chunk)

    return CleanResponse(
        cleaned_lines=lines_out,
        summary_hint="Transcript parsed locally — add your GROQ_API_KEY for AI-powered cleaning.",
        participant_names=sorted(speakers - {"Narrator", "Notes"}),
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
            client = Groq(api_key=api_key)
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
                model="llama3-70b-8192",
                temperature=0.15,
                max_tokens=6000,
            )
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

