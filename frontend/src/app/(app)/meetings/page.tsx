'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MeetingsSidebar from '@/components/layout/MeetingsSidebar';
import CreateMeetingModal from '@/components/meetings/CreateMeetingModal';
import { getMeetings, deleteMeeting, formatDuration, formatRelativeDate, getInitials, getSpeakerColor } from '@/lib/api';
import { Meeting } from '@/lib/types';
import { useToast } from '@/components/ui/ToastProvider';

function MeetingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const channel = searchParams.get('channel') || 'My Meetings';

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMeetings({ search: search || undefined, channel, sort });
      setMeetings(data);
    } catch {
      toast('Failed to load meetings', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, channel, sort]);

  useEffect(() => {
    const timeout = setTimeout(fetchMeetings, 300);
    return () => clearTimeout(timeout);
  }, [fetchMeetings]);

  const handleDelete = async (id: number) => {
    try {
      await deleteMeeting(id);
      toast('Meeting deleted', 'success');
      setDeleteConfirm(null);
      fetchMeetings();
    } catch {
      toast('Failed to delete meeting', 'error');
    }
  };

  return (
    <>
      <MeetingsSidebar />
      <div className="main-content">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-search">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="meetings-search"
              type="text"
              placeholder="Search by title or keyword"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="topbar-kbd">Ctrl+K</span>
          </div>

          <div className="topbar-spacer" />

          <div className="topbar-actions">
            <button
              id="new-meeting-btn"
              className="topbar-btn topbar-btn-primary"
              onClick={() => setShowCreate(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Meeting
            </button>
            <div className="avatar" style={{ background: '#6938ef' }}>SC</div>
          </div>
        </div>

        {/* Content */}
        <div className="page-content">
          <div className="meetings-page">
            <div className="meetings-page-header">
              <div>
                <h1 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 2 }}>{channel}</h1>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>
                  AI-powered meeting recordings and transcriptions
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="meetings-filters">
              <div className="filter-input">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  id="meetings-filter-search"
                  type="text"
                  placeholder="Filter meetings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                id="meetings-sort"
                className="filter-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="title_asc">Title A-Z</option>
                <option value="duration_desc">Longest First</option>
              </select>

              <span className="meetings-count">
                {loading ? 'Loading...' : `${meetings.length} meeting${meetings.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {/* Meetings list */}
            {loading ? (
              <div className="meetings-grid">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ height: 70, borderRadius: 10 }} className="skeleton" />
                ))}
              </div>
            ) : meetings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h3>No meetings found</h3>
                <p>
                  {search ? `No meetings match "${search}"` : 'Add your first meeting to get started.'}
                </p>
                {!search && (
                  <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
                    Create Meeting
                  </button>
                )}
              </div>
            ) : (
              <div className="meetings-grid">
                {meetings.map((meeting) => {
                  const initials = getInitials(meeting.title);
                  const date = formatRelativeDate(meeting.date);
                  const duration = formatDuration(meeting.duration_seconds);
                  const participants = meeting.participants || [];

                  return (
                    <div key={meeting.id} style={{ position: 'relative' }}>
                      <Link href={`/meetings/${meeting.id}`} className="meeting-card">
                        {/* Color block */}
                        <div className="meeting-card-color" style={{ background: meeting.thumbnail_color }}>
                          {initials}
                        </div>

                        {/* Body */}
                        <div className="meeting-card-body">
                          <div className="meeting-card-title">{meeting.title}</div>
                          <div className="meeting-card-meta">
                            <span>{date}</span>
                            <span className="meeting-card-meta-dot" />
                            <span>{duration}</span>
                            <span className="meeting-card-meta-dot" />
                            <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
                            {meeting.action_items?.length > 0 && (
                              <>
                                <span className="meeting-card-meta-dot" />
                                <span style={{ color: 'var(--color-brand)' }}>
                                  {meeting.action_items.filter((a) => !a.completed).length} tasks
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Participant avatars */}
                        <div className="meeting-card-participants">
                          {participants.slice(0, 4).map((p, idx) => (
                            <div
                              key={idx}
                              className="participant-avatar"
                              style={{ background: getSpeakerColor(p), zIndex: participants.length - idx }}
                              title={p}
                            >
                              {getInitials(p)}
                            </div>
                          ))}
                          {participants.length > 4 && (
                            <div
                              className="participant-avatar"
                              style={{ background: '#9ca3af', zIndex: 0 }}
                            >
                              +{participants.length - 4}
                            </div>
                          )}
                        </div>

                        {/* Status badge */}
                        <div className={`meeting-card-badge badge-${meeting.status}`}>
                          <svg width="8" height="8" viewBox="0 0 8 8">
                            <circle cx="4" cy="4" r="4" fill="currentColor" />
                          </svg>
                          {meeting.status === 'completed' ? 'Completed' : meeting.status === 'processing' ? 'Processing' : 'Failed'}
                        </div>

                        {/* Actions */}
                        <div className="meeting-card-actions" onClick={(e) => e.preventDefault()}>
                          <button
                            className="icon-btn danger"
                            title="Delete meeting"
                            onClick={(e) => {
                              e.preventDefault();
                              setDeleteConfirm(meeting.id);
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                            </svg>
                          </button>
                        </div>
                      </Link>

                      {/* Delete confirmation */}
                      {deleteConfirm === meeting.id && (
                        <div
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            zIndex: 50,
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px 16px',
                            boxShadow: 'var(--shadow-lg)',
                            width: 240,
                          }}
                        >
                          <p style={{ fontSize: '0.875rem', marginBottom: 10, color: 'var(--color-text-primary)' }}>
                            Delete this meeting?
                          </p>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(meeting.id)}>
                              Delete
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateMeetingModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchMeetings}
        />
      )}
    </>
  );
}

export default function MeetingsPage() {
  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <Suspense fallback={<div className="skeleton" style={{ flex: 1 }} />}>
        <MeetingsContent />
      </Suspense>
    </div>
  );
}
