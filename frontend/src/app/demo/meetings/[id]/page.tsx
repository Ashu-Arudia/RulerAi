'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMeeting, updateMeeting, createActionItem, updateActionItem, deleteActionItem, formatDuration, formatTime, formatDate, getInitials, getSpeakerColor } from '@/lib/api';
import { MeetingDetail, TranscriptLine, ActionItem } from '@/lib/types';
import { useToast } from '@/components/ui/ToastProvider';

// ─── Audio Player Component ──────────────────────────────────────────────────
function AudioPlayer({
  duration,
  currentTime,
  playing,
  onPlayPause,
  onSeek,
}: {
  duration: number;
  currentTime: number;
  playing: boolean;
  onPlayPause: () => void;
  onSeek: (t: number) => void;
}) {
  const seekBarRef = useRef<HTMLDivElement>(null);
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekClick = (e: React.MouseEvent) => {
    if (!seekBarRef.current) return;
    const rect = seekBarRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, ratio)) * duration);
  };

  return (
    <div className="audio-player">
      <div className="player-meta">
        <span className="player-time">
          {formatTime(currentTime)} <span className="player-duration">/ {formatTime(duration)}</span>
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Mock Audio Player</span>
      </div>

      <div className="player-seekbar" ref={seekBarRef} onClick={handleSeekClick}>
        <div className="player-seekbar-progress" style={{ width: `${pct}%` }}>
          <div className="player-seekbar-thumb" />
        </div>
      </div>

      <div className="player-controls">
        <button className="player-btn" title="Back 15s" onClick={() => onSeek(Math.max(0, currentTime - 15))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.95" />
            <text x="7" y="15" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">15</text>
          </svg>
        </button>

        <button className="player-btn player-btn-play" onClick={onPlayPause} id="player-play-pause">
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        <button className="player-btn" title="Forward 15s" onClick={() => onSeek(Math.min(duration, currentTime + 15))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-.49-3.95" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Notes Panel ─────────────────────────────────────────────────────────────
function NotesPanel({
  meeting,
  onSeek,
  onActionItemToggle,
  onActionItemDelete,
  onActionItemCreate,
  onMeetingEdit,
}: {
  meeting: MeetingDetail;
  onSeek: (t: number) => void;
  onActionItemToggle: (item: ActionItem) => void;
  onActionItemDelete: (id: number) => void;
  onActionItemCreate: (text: string) => void;
  onMeetingEdit: () => void;
}) {
  const [newActionText, setNewActionText] = useState('');
  const [addingAction, setAddingAction] = useState(false);

  const handleAddAction = () => {
    if (!newActionText.trim()) return;
    onActionItemCreate(newActionText.trim());
    setNewActionText('');
    setAddingAction(false);
  };

  return (
    <div className="tab-content">
      <div className="notes-panel">
        {/* Overview */}
        {meeting.summary && (
          <>
            <div className="notes-section">
              <div className="notes-section-header">
                <div className="notes-section-title">
                  <svg className="notes-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  Meeting Summary
                </div>
              </div>
              <p className="overview-text">{meeting.summary.overview}</p>
            </div>

            <div className="divider" />

            {/* Key Topics */}
            {meeting.summary.key_topics.length > 0 && (
              <>
                <div className="notes-section">
                  <div className="notes-section-header">
                    <div className="notes-section-title">
                      <svg className="notes-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      Key Topics
                    </div>
                  </div>
                  <div className="key-topics-list">
                    {meeting.summary.key_topics.map((topic, i) => (
                      <span key={i} className="topic-chip">{topic}</span>
                    ))}
                  </div>
                </div>
                <div className="divider" />
              </>
            )}

            {/* Chapters */}
            {meeting.summary.chapters.length > 0 && (
              <>
                <div className="notes-section">
                  <div className="notes-section-header">
                    <div className="notes-section-title">
                      <svg className="notes-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                      Outline
                    </div>
                  </div>
                  <div className="chapters-list">
                    {meeting.summary.chapters.map((ch, i) => (
                      <div key={i} className="chapter-item" onClick={() => onSeek(ch.timestamp)}>
                        <span className="chapter-timestamp">{formatTime(ch.timestamp)}</span>
                        <div className="chapter-body">
                          <div className="chapter-title">{ch.title}</div>
                          <div className="chapter-desc">{ch.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="divider" />
              </>
            )}
          </>
        )}

        {/* Action Items */}
        <div className="notes-section">
          <div className="notes-section-header">
            <div className="notes-section-title">
              <svg className="notes-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              Action Items
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
              {meeting.action_items?.filter((a) => a.completed).length}/{meeting.action_items?.length}
            </span>
          </div>

          <div className="action-items-list">
            {(meeting.action_items || []).map((item) => (
              <div key={item.id} className="action-item">
                <div
                  className={`action-item-check ${item.completed ? 'checked' : ''}`}
                  onClick={() => onActionItemToggle(item)}
                  title={item.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {item.completed && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="action-item-body">
                  <div className={`action-item-text ${item.completed ? 'completed' : ''}`}>{item.text}</div>
                  <div className="action-item-meta">
                    {item.assignee && (
                      <span className="action-item-assignee">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                        {item.assignee}
                      </span>
                    )}
                    {item.due_date && (
                      <span>
                        Due {item.due_date}
                      </span>
                    )}
                  </div>
                </div>
                <div className="action-item-actions">
                  <button
                    className="icon-btn danger"
                    onClick={() => onActionItemDelete(item.id)}
                    title="Delete action item"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {addingAction ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input
                  id="new-action-input"
                  className="form-input"
                  placeholder="Type action item..."
                  value={newActionText}
                  onChange={(e) => setNewActionText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddAction();
                    if (e.key === 'Escape') setAddingAction(false);
                  }}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary btn-sm" onClick={handleAddAction}>Add</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setAddingAction(false)}>Cancel</button>
              </div>
            ) : (
              <button className="add-action-btn" onClick={() => setAddingAction(true)} id="add-action-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add action item
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Transcript Panel ─────────────────────────────────────────────────────────
function TranscriptPanel({
  lines,
  currentTime,
  onSeek,
}: {
  lines: TranscriptLine[];
  currentTime: number;
  onSeek: (t: number) => void;
}) {
  const [search, setSearch] = useState('');
  const activeLineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeIdx = lines.findIndex(
    (l) => currentTime >= l.start_time && currentTime < l.end_time
  );

  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      const container = containerRef.current;
      const el = activeLineRef.current;
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      const elTop = el.offsetTop;
      const elBottom = elTop + el.clientHeight;
      if (elTop < containerTop || elBottom > containerBottom) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIdx]);

  const filteredLines = search
    ? lines.filter((l) => l.text.toLowerCase().includes(search.toLowerCase()) || l.speaker.toLowerCase().includes(search.toLowerCase()))
    : lines;

  const matchCount = search ? filteredLines.length : 0;

  const highlightText = (text: string) => {
    if (!search) return <>{text}</>;
    const parts = text.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === search.toLowerCase() ? <mark key={i}>{part}</mark> : part
        )}
      </>
    );
  };

  // Group lines by speaker for display
  const displayLines = search ? filteredLines : lines;

  return (
    <div className="transcript-panel">
      <div className="transcript-search-bar">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          id="transcript-search"
          type="text"
          placeholder="Search transcript..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && matchCount > 0 && (
          <span className="transcript-search-count">{matchCount} match{matchCount !== 1 ? 'es' : ''}</span>
        )}
      </div>

      <div className="transcript-lines" ref={containerRef}>
        {displayLines.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <p>No matches found for &quot;{search}&quot;</p>
          </div>
        ) : (
          displayLines.map((line, idx) => {
            const isActive = !search && lines.indexOf(line) === activeIdx;
            const speakerColor = getSpeakerColor(line.speaker);

            return (
              <div
                key={line.id}
                ref={isActive ? activeLineRef : undefined}
                className={`transcript-line ${isActive ? 'active' : ''} ${search ? 'highlighted' : ''}`}
                onClick={() => onSeek(line.start_time)}
              >
                <span className="transcript-line-timestamp">{formatTime(line.start_time)}</span>
                <div className="transcript-line-body">
                  <div className="transcript-line-speaker" style={{ color: speakerColor }}>
                    {line.speaker}
                  </div>
                  <div className="transcript-line-text">
                    {highlightText(line.text)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Edit Meeting Modal ───────────────────────────────────────────────────────
function EditMeetingModal({
  meeting,
  onClose,
  onUpdated,
}: {
  meeting: MeetingDetail;
  onClose: () => void;
  onUpdated: (m: MeetingDetail) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: meeting.title,
    host: meeting.host,
    participants: (meeting.participants || []).join(', '),
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const participants = form.participants.split(',').map((p) => p.trim()).filter(Boolean);
      await updateMeeting(meeting.id, { title: form.title, host: form.host, participants });
      const updated = await getMeeting(meeting.id);
      onUpdated(updated);
      toast('Meeting updated', 'success');
      onClose();
    } catch {
      toast('Failed to update meeting', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Edit Meeting</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Host</label>
              <input className="form-input" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Participants</label>
              <input className="form-input" value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} />
              <span className="form-hint">Comma-separated names</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Meeting Detail Page ─────────────────────────────────────────────────
export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const meetingId = parseInt(params.id as string);

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [leftTab, setLeftTab] = useState<'notes' | 'aiskills'>('notes');
  const [rightTab, setRightTab] = useState<'transcript' | 'askfred'>('transcript');
  const [editOpen, setEditOpen] = useState(false);

  // Player state (mocked)
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchMeeting();
  }, [meetingId]);

  const fetchMeeting = async () => {
    setLoading(true);
    try {
      const data = await getMeeting(meetingId);
      setMeeting(data);
    } catch {
      toast('Failed to load meeting', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Mock player timer
  useEffect(() => {
    if (playing && meeting) {
      timerRef.current = setInterval(() => {
        setCurrentTime((t) => {
          if (t >= meeting.duration_seconds) {
            setPlaying(false);
            return meeting.duration_seconds;
          }
          return t + 0.5;
        });
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, meeting]);

  const handleSeek = useCallback((t: number) => {
    setCurrentTime(t);
  }, []);

  const handlePlayPause = () => setPlaying((p) => !p);

  const handleActionItemToggle = async (item: ActionItem) => {
    try {
      await updateActionItem(item.id, { completed: !item.completed });
      const updated = await getMeeting(meetingId);
      setMeeting(updated);
      toast(item.completed ? 'Marked incomplete' : 'Marked complete', 'success');
    } catch {
      toast('Failed to update action item', 'error');
    }
  };

  const handleActionItemDelete = async (id: number) => {
    try {
      await deleteActionItem(id);
      const updated = await getMeeting(meetingId);
      setMeeting(updated);
      toast('Action item deleted', 'success');
    } catch {
      toast('Failed to delete action item', 'error');
    }
  };

  const handleActionItemCreate = async (text: string) => {
    try {
      await createActionItem(meetingId, { text });
      const updated = await getMeeting(meetingId);
      setMeeting(updated);
      toast('Action item added', 'success');
    } catch {
      toast('Failed to add action item', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 57, borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12 }}>
          <div className="skeleton" style={{ width: 120, height: 20 }} />
          <div className="skeleton" style={{ width: 200, height: 20 }} />
        </div>
        <div style={{ flex: 1, display: 'flex' }}>
          <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" style={{ height: 60 }} />)}
          </div>
          <div style={{ flex: 1, padding: 20, borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" style={{ height: 50 }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <h3>Meeting not found</h3>
        <Link href="/demo/meetings" className="btn btn-primary" style={{ marginTop: 16 }}>Back to Meetings</Link>
      </div>
    );
  }

  const participants = meeting.participants || [];
  const completedActions = (meeting.action_items || []).filter((a) => a.completed).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="meeting-detail-header">
        <button className="meeting-detail-back" onClick={() => router.push('/demo/meetings')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Meetings
        </button>
        <span className="breadcrumb-sep">/</span>
        <div className="meeting-detail-title-row">
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: meeting.thumbnail_color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'white',
              flexShrink: 0,
            }}
          >
            {getInitials(meeting.title)}
          </div>
          <h1 className="meeting-detail-title">{meeting.title}</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
          {/* Meta info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            <span>{formatDate(meeting.date)}</span>
            <span>·</span>
            <span>{formatDuration(meeting.duration_seconds)}</span>
            <span>·</span>
            <span>{participants.length} participants</span>
          </div>

          {/* Participant avatars */}
          <div style={{ display: 'flex' }}>
            {participants.slice(0, 5).map((p, i) => (
              <div
                key={i}
                className="participant-avatar"
                style={{ background: getSpeakerColor(p), marginLeft: i === 0 ? 0 : -6 }}
                title={p}
              >
                {getInitials(p)}
              </div>
            ))}
          </div>

          {/* Edit button */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setEditOpen(true)}
            title="Edit meeting"
            id="edit-meeting-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
        </div>
      </div>

      {/* Split Pane */}
      <div className="split-pane" style={{ flex: 1 }}>
        {/* Left: Notes + Media Player */}
        <div className="split-pane-left" id="tour-notes-panel">
          <div className="tab-bar">
            <div className={`tab-item ${leftTab === 'notes' ? 'active' : ''}`} onClick={() => setLeftTab('notes')}>
              Notes
              {(meeting.action_items || []).length > 0 && (
                <span className="tab-badge">{completedActions}/{(meeting.action_items || []).length}</span>
              )}
            </div>
            <div className={`tab-item ${leftTab === 'aiskills' ? 'active' : ''}`} onClick={() => setLeftTab('aiskills')}>
              AI Skills
            </div>
          </div>

          {leftTab === 'notes' ? (
            <NotesPanel
              meeting={meeting}
              onSeek={handleSeek}
              onActionItemToggle={handleActionItemToggle}
              onActionItemDelete={handleActionItemDelete}
              onActionItemCreate={handleActionItemCreate}
              onMeetingEdit={() => setEditOpen(true)}
            />
          ) : (
            <div className="tab-content">
              <div className="placeholder-page">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="1.5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <h2>AI Skills</h2>
                <p style={{ fontSize: '0.875rem', textAlign: 'center', maxWidth: 260 }}>
                  Run custom AI skills on this meeting to extract specific insights, generate follow-ups, and more.
                </p>
                <span className="coming-soon-badge">Coming Soon</span>
              </div>
            </div>
          )}

          {/* Audio Player */}
          <AudioPlayer
            duration={meeting.duration_seconds}
            currentTime={currentTime}
            playing={playing}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
          />
        </div>

        {/* Right: Transcript / AskFred */}
        <div className="split-pane-right">
          <div className="tab-bar">
            <div className={`tab-item ${rightTab === 'askfred' ? 'active' : ''}`} onClick={() => setRightTab('askfred')}>
              AskFred
            </div>
            <div className={`tab-item ${rightTab === 'transcript' ? 'active' : ''}`} onClick={() => setRightTab('transcript')}>
              Transcript
              {meeting.transcript_lines?.length > 0 && (
                <span className="tab-badge">{meeting.transcript_lines.length}</span>
              )}
            </div>
          </div>

          {rightTab === 'transcript' ? (
            <TranscriptPanel
              lines={meeting.transcript_lines || []}
              currentTime={currentTime}
              onSeek={handleSeek}
            />
          ) : (
            <div className="tab-content">
              <div className="placeholder-page">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <h2>AskFred</h2>
                <p style={{ fontSize: '0.875rem', textAlign: 'center', maxWidth: 260 }}>
                  Ask any question about this meeting and get instant AI-powered answers based on the transcript.
                </p>
                <span className="coming-soon-badge">Coming Soon</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {editOpen && (
        <EditMeetingModal
          meeting={meeting}
          onClose={() => setEditOpen(false)}
          onUpdated={setMeeting}
        />
      )}
    </div>
  );
}
