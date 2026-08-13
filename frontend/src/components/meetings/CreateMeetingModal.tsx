'use client';

import { useState } from 'react';
import { createMeeting } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';

interface CreateMeetingModalProps {
  onClose: () => void;
  onCreated: () => void;
  /** Pass the Google user ID to scope the meeting to the auth'd user. Omit for demo. */
  userId?: string | null;
}

const COLORS = ['#6938ef', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];

export default function CreateMeetingModal({ onClose, onCreated, userId }: CreateMeetingModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    host: 'Sarah Chen',
    date: new Date().toISOString().slice(0, 16),
    duration_minutes: 30,
    participants: '',
    channel: 'My Meetings',
    thumbnail_color: '#6938ef',
    transcript_text: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setLoading(true);
    try {
      const participants = form.participants
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      if (!participants.includes(form.host)) {
        participants.unshift(form.host);
      }

      await createMeeting({
        title: form.title,
        date: new Date(form.date).toISOString(),
        duration_seconds: form.duration_minutes * 60,
        host: form.host,
        participants,
        status: form.transcript_text ? 'completed' : 'processing',
        thumbnail_color: form.thumbnail_color,
        channel: form.channel,
        transcript_text: form.transcript_text || undefined,
      }, userId);

      toast('Meeting created successfully!', 'success');
      onCreated();
      onClose();
    } catch (err) {
      toast('Failed to create meeting', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">New Meeting</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Meeting Title <span>*</span></label>
              <input
                id="meeting-title"
                className="form-input"
                placeholder="e.g. Q3 Product Review"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Host</label>
                <input
                  id="meeting-host"
                  className="form-input"
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date & Time</label>
                <input
                  id="meeting-date"
                  className="form-input"
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Duration (minutes)</label>
                <input
                  id="meeting-duration"
                  className="form-input"
                  type="number"
                  min={1}
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 30 })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Channel</label>
                <select
                  id="meeting-channel"
                  className="form-input filter-select"
                  style={{ paddingRight: 32, appearance: 'auto' }}
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value })}
                >
                  <option>My Meetings</option>
                  <option>All Meetings</option>
                  <option>Client Calls</option>
                  <option>Engineering Syncs</option>
                  <option>Sales Calls</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Participants</label>
              <input
                id="meeting-participants"
                className="form-input"
                placeholder="John Doe, Jane Smith, ..."
                value={form.participants}
                onChange={(e) => setForm({ ...form, participants: e.target.value })}
              />
              <span className="form-hint">Comma-separated names. Host is added automatically.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, thumbnail_color: c })}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: c,
                      border: form.thumbnail_color === c ? '3px solid #111827' : '3px solid transparent',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Transcript (optional)</label>
              <textarea
                id="meeting-transcript"
                className="form-input form-textarea"
                placeholder={'Paste transcript here...\nFormat: Speaker Name: their speech text\nOr: [00:01:23] Speaker: Text'}
                value={form.transcript_text}
                onChange={(e) => setForm({ ...form, transcript_text: e.target.value })}
              />
              <span className="form-hint">Supports Speaker: Text or [MM:SS] Speaker: Text formats</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" id="create-meeting-submit" disabled={loading || !form.title.trim()}>
              {loading ? (
                <>
                  <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Creating...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create Meeting
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
