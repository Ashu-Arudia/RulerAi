'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/common/ThemeToggle';
import CreateMeetingModal from '@/components/meetings/CreateMeetingModal';
import { getMeetings, formatDuration, formatRelativeDate, getInitials, getSpeakerColor } from '@/lib/api';
import { Meeting } from '@/lib/types';

export default function DemoHomePage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getMeetings({});
      setMeetings(data);
    } catch {
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const firstName = 'Alex';
  const userName = 'Alex Turner';
  const userEmail = 'alex.turner@scalerai.demo';

  const totalMeetings = meetings.length;
  const totalActionItems = meetings.reduce((acc, m) => acc + (m.action_items?.length || 0), 0);
  const completedActionItems = meetings.reduce((acc, m) => acc + (m.action_items?.filter(a => a.completed).length || 0), 0);
  const totalMinutes = meetings.reduce((acc, m) => acc + Math.round((m.duration_seconds || 0) / 60), 0);
  const hoursSaved = (totalMinutes * 0.4 / 60).toFixed(1);

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="page-content">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <span className="channel-badge">
            Workspace Hub (Demo)
          </span>
          <span className="date-badge">
            {todayDate}
          </span>
        </div>

        <div className="topbar-actions">
          <ThemeToggle variant="pill" />
          <button
            id="home-new-meeting-btn"
            className="topbar-btn topbar-btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Meeting</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="home-container">

        {/* Executive Welcome Hero Banner */}
        <div className="home-hero-card">
          <div className="home-hero-content">
            <div className="home-status-badge">
              <span className="home-status-dot" />
              Live Demo Workspace Connected
            </div>
            <h1 className="home-hero-title">
              Welcome back, {firstName}! 👋
            </h1>
            <p className="home-hero-subtitle">
              Here is your AI meeting intelligence dashboard. Record conversations, auto-generate summaries, and track team action items in real-time.
            </p>
          </div>

          <div className="home-user-profile-badge">
            <div className="home-user-avatar-initials">
              AT
            </div>
            <div>
              <div className="home-user-name">{userName}</div>
              <div className="home-user-email">{userEmail}</div>
            </div>
          </div>
        </div>

        {/* 4 KPI Metrics Grid */}
        <div className="home-metrics-grid">
          <div className="home-metric-card">
            <div className="home-metric-header">
              <span>Total Meetings</span>
              <span className="home-metric-tag brand">Workspace</span>
            </div>
            <div className="home-metric-value">{loading ? '—' : totalMeetings}</div>
            <div className="home-metric-subtext">
              <span className="success-text">↑ Active</span> recorded in catalog
            </div>
          </div>

          <div className="home-metric-card">
            <div className="home-metric-header">
              <span>Action Items</span>
              <span className="home-metric-tag warning">{completedActionItems}/{totalActionItems} done</span>
            </div>
            <div className="home-metric-value">{loading ? '—' : totalActionItems}</div>
            <div className="home-progress-bar">
              <div
                className="home-progress-fill"
                style={{ width: `${totalActionItems > 0 ? (completedActionItems / totalActionItems) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="home-metric-card">
            <div className="home-metric-header">
              <span>Hours Saved</span>
              <span className="home-metric-tag success">AI Efficiency</span>
            </div>
            <div className="home-metric-value brand-text">{loading ? '—' : `${hoursSaved}h`}</div>
            <div className="home-metric-subtext">Estimated review time saved</div>
          </div>

          <div className="home-metric-card">
            <div className="home-metric-header">
              <span>AI Engine</span>
              <span className="home-metric-tag info">Groq LLM</span>
            </div>
            <div className="home-metric-value">99.4%</div>
            <div className="home-metric-subtext">Transcription accuracy rate</div>
          </div>
        </div>

        {/* Quick Launch Action Cards */}
        <div className="home-section">
          <h2 className="home-section-title">Quick Actions</h2>
          <div className="home-actions-grid">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="home-action-card text-left cursor-pointer"
            >
              <div className="home-action-icon brand">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div className="home-action-title">Create Meeting</div>
              <div className="home-action-desc">Paste transcript notes or upload audio files</div>
            </button>

            <Link href="/demo/meetings" className="home-action-card">
              <div className="home-action-icon info">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="home-action-title">Meetings Library</div>
              <div className="home-action-desc">Browse all past recordings & AI notes</div>
            </Link>

            <Link href="/demo/askfred" className="home-action-card">
              <div className="home-action-icon purple">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="home-action-title">AskFred AI</div>
              <div className="home-action-desc">Chat & query intelligence across meetings</div>
            </Link>

            <Link href="/demo/integrations" className="home-action-card">
              <div className="home-action-icon success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </div>
              <div className="home-action-title">Integrations</div>
              <div className="home-action-desc">Connect Zoom, Google Meet & Webhooks</div>
            </Link>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="home-section">
          <div className="home-section-header">
            <h2 className="home-section-title">Recent Meetings</h2>
            <Link href="/demo/meetings" className="home-link">View All →</Link>
          </div>

          {loading ? (
            <div className="home-recent-list">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <div className="home-empty-card">
              <div className="home-empty-icon">🎙️</div>
              <div className="home-empty-title">No meetings recorded yet</div>
              <p className="home-empty-desc">Your recorded meetings and AI transcripts will appear here. Create your first meeting to get started!</p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="topbar-btn topbar-btn-primary"
              >
                Create First Meeting
              </button>
            </div>
          ) : (
            <div className="home-recent-list">
              {meetings.slice(0, 5).map((meeting) => {
                const initials = getInitials(meeting.title);
                const date = formatRelativeDate(meeting.date);
                const duration = formatDuration(meeting.duration_seconds);
                const participants = meeting.participants || [];

                return (
                  <Link
                    key={meeting.id}
                    href={`/demo/meetings/${meeting.id}`}
                    className="home-recent-item group"
                  >
                    <div className="home-recent-left">
                      <div
                        className="home-recent-thumb"
                        style={{ background: meeting.thumbnail_color || '#6938ef' }}
                      >
                        {initials}
                      </div>
                      <div className="home-recent-info">
                        <div className="home-recent-meeting-title">
                          {meeting.title}
                        </div>
                        <div className="home-recent-meta">
                          <span>{date}</span>
                          <span>•</span>
                          <span>{duration}</span>
                          <span>•</span>
                          <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>

                    <div className="home-recent-right">
                      <div className="home-participant-avatars">
                        {participants.slice(0, 3).map((p, idx) => (
                          <div
                            key={idx}
                            className="home-avatar-circle"
                            style={{ background: getSpeakerColor(p) }}
                            title={p}
                          >
                            {getInitials(p)}
                          </div>
                        ))}
                      </div>
                      <span className="home-badge-completed">Completed</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Account Footer */}
        <div className="home-account-footer">
          <div className="home-account-left">
            <div className="home-pro-tag">PRO</div>
            <div>
              <div className="home-account-plan">ScalerAI Pro Plan Active</div>
              <div className="home-account-sub">Unlimited LLM transcriptions & intelligence summaries</div>
            </div>
          </div>

          <Link
            href="/"
            className="home-signout-btn"
          >
            Back to Landing
          </Link>
        </div>

      </div>

      {showCreate && (
        <CreateMeetingModal
          onClose={() => setShowCreate(false)}
          onCreated={loadData}
        />
      )}
    </div>
  );
}
