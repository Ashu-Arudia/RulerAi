'use client';

import { useState, useRef, useEffect } from 'react';
import { createMeeting, getSampleTranscripts, getSampleTranscriptContent, cleanTranscript, SampleTranscript } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import { useQuery } from '@tanstack/react-query';

interface CreateMeetingModalProps {
  onClose: () => void;
  onCreated: () => void;
  userId?: string | null;
}

const COLORS = ['#6938ef', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];
type TranscriptTab = 'paste' | 'samples' | 'upload';

export default function CreateMeetingModal({ onClose, onCreated, userId }: CreateMeetingModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [cleaningAI, setCleaningAI] = useState(false);
  const [transcriptTab, setTranscriptTab] = useState<TranscriptTab>('samples');
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [aiCleaned, setAiCleaned] = useState(false);

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

  // Fetch sample transcripts from backend
  const { data: samples = [], isLoading: samplesLoading } = useQuery<SampleTranscript[]>({
    queryKey: ['sample-transcripts'],
    queryFn: getSampleTranscripts,
    staleTime: Infinity,
  });

  const hasTranscript = form.transcript_text.trim().length > 0;

  const handleSelectSample = async (sampleId: string) => {
    setSelectedSampleId(sampleId);
    try {
      const data = await getSampleTranscriptContent(sampleId);
      setForm((f) => ({ ...f, transcript_text: data.content }));
      if (!form.title) {
        setForm((f) => ({ ...f, title: data.title, transcript_text: data.content }));
      }
      setAiCleaned(false);
    } catch {
      toast('Failed to load sample transcript', 'error');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.match(/\.(txt|vtt|srt)$/i)) {
      toast('Please upload a .txt, .vtt, or .srt file', 'error');
      return;
    }
    const text = await file.text();
    setUploadedFileName(file.name);
    setForm((f) => ({ ...f, transcript_text: text }));
    setAiCleaned(false);
    toast(`Loaded "${file.name}"`, 'success');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleCleanWithAI = async () => {
    if (!hasTranscript) return;
    setCleaningAI(true);
    try {
      const result = await cleanTranscript(form.transcript_text);
      if (result.cleaned_lines.length > 0) {
        // Convert cleaned lines back to text format
        const cleanedText = result.cleaned_lines
          .map((l) => {
            const mins = Math.floor(l.start_time / 60).toString().padStart(2, '0');
            const secs = Math.floor(l.start_time % 60).toString().padStart(2, '0');
            return `[${mins}:${secs}] ${l.speaker}: ${l.text}`;
          })
          .join('\n');

        // Auto-fill participants if detected
        const newParticipants = result.participant_names.length > 0 && !form.participants
          ? result.participant_names.join(', ')
          : form.participants;

        setForm((f) => ({ ...f, transcript_text: cleanedText, participants: newParticipants }));
        setAiCleaned(true);

        // Switch to Paste Text tab so the user sees the cleaned result + footer buttons
        setTranscriptTab('paste');

        // Scroll to footer after a brief render delay
        setTimeout(() => {
          footerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 150);

        const mode = result.summary_hint.includes('locally')
          ? `Structured ${result.cleaned_lines.length} lines (local parser)`
          : `AI cleaned ${result.cleaned_lines.length} lines`;
        toast(mode, 'success');
      } else {
        toast('Could not extract any content — try adding more text', 'error');
      }
    } catch {
      toast('AI cleaning failed — check your GROQ_API_KEY', 'error');
    } finally {
      setCleaningAI(false);
    }
  };

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

      await createMeeting(
        {
          title: form.title,
          date: new Date(form.date).toISOString(),
          duration_seconds: form.duration_minutes * 60,
          host: form.host,
          participants,
          status: form.transcript_text ? 'completed' : 'processing',
          thumbnail_color: form.thumbnail_color,
          channel: form.channel,
          transcript_text: form.transcript_text || undefined,
        },
        userId,
      );

      toast('Meeting created successfully!', 'success');
      onCreated();
      onClose();
    } catch {
      toast('Failed to create meeting', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{
        maxWidth: 600,
        width: '95vw',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h3 className="modal-title">New Meeting</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" ref={modalBodyRef} style={{ overflowY: 'auto', flex: 1 }}>
            {/* Title */}
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

            {/* Host + Date */}
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

            {/* Duration + Channel */}
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

            {/* Participants */}
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

            {/* Color */}
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, thumbnail_color: c })}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c,
                      border: form.thumbnail_color === c ? '3px solid #111827' : '3px solid transparent',
                      cursor: 'pointer', outline: 'none', transition: 'border-color 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* ─── Transcript Section ─────────────────────────────────── */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ marginBottom: 10 }}>
                Transcript
                {aiCleaned && (
                  <span style={{
                    marginLeft: 8, padding: '2px 8px', borderRadius: 99,
                    background: 'rgba(16,185,129,0.15)', color: '#10b981',
                    fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
                  }}>
                    AI Cleaned
                  </span>
                )}
              </label>

              {/* Tab switcher */}
              <div style={{
                display: 'flex', gap: 0, marginBottom: 12,
                background: 'var(--color-surface-hover)', borderRadius: 8, padding: 3,
                border: '1px solid var(--color-border)',
              }}>
                {([
                  { id: 'samples', label: '📂 Default Samples' },
                  { id: 'upload', label: '📁 Upload File' },
                  { id: 'paste', label: '✍️ Paste Text' },
                ] as { id: TranscriptTab; label: string }[]).map((tab) => (
                  <button
                    key={tab.id}
                    id={`tour-${tab.id}-tab`}
                    type="button"
                    onClick={() => setTranscriptTab(tab.id)}
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: transcriptTab === tab.id ? 'var(--color-bg)' : 'transparent',
                      color: transcriptTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                      fontSize: '0.8rem',
                      fontWeight: transcriptTab === tab.id ? 600 : 400,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s',
                      boxShadow: transcriptTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sample Transcripts */}
              {transcriptTab === 'samples' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {samplesLoading ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="skeleton" style={{ height: 72, borderRadius: 10 }} />
                    ))
                  ) : (
                    samples.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => handleSelectSample(sample.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: selectedSampleId === sample.id
                            ? '2px solid #6938ef'
                            : '1px solid var(--color-border)',
                          background: selectedSampleId === sample.id
                            ? 'rgba(105,56,239,0.08)'
                            : 'var(--color-surface)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                          transition: 'all 0.15s',
                          width: '100%',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: 'linear-gradient(135deg, #6938ef22, #6938ef44)',
                          border: '1px solid rgba(105,56,239,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, flexShrink: 0,
                        }}>
                          {sample.id === 'product_review' ? '📊' : sample.id === 'engineering_sync' ? '⚙️' : '📞'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                            {sample.title}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
                            {sample.description}
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', padding: '1px 6px', borderRadius: 99, background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                              {sample.duration}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', padding: '1px 6px', borderRadius: 99, background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                              {sample.participants.length} speakers
                            </span>
                          </div>
                        </div>
                        {selectedSampleId === sample.id && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6938ef" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* File Upload */}
              {transcriptTab === 'upload' && (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: dragOver ? '2px dashed #6938ef' : '2px dashed var(--color-border)',
                    borderRadius: 10,
                    padding: '28px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragOver ? 'rgba(105,56,239,0.05)' : 'var(--color-surface)',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.vtt,.srt"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>
                  {uploadedFileName ? (
                    <>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#10b981', marginBottom: 4 }}>
                        {uploadedFileName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>
                        Click to replace
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                        Drop your transcript here
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>
                        or click to browse — .txt, .vtt, .srt supported
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Paste Text */}
              {transcriptTab === 'paste' && (
                <textarea
                  id="meeting-transcript"
                  className="form-input form-textarea"
                  placeholder={'Paste transcript here...\nFormat: Speaker Name: their speech text\nOr: [00:01:23] Speaker: Text'}
                  value={form.transcript_text}
                  onChange={(e) => {
                    setForm({ ...form, transcript_text: e.target.value });
                    setAiCleaned(false);
                  }}
                  style={{ minHeight: 140 }}
                />
              )}

              {/* Clean with AI button */}
              {hasTranscript && (
                <button
                  id="clean-with-ai-btn"
                  type="button"
                  onClick={handleCleanWithAI}
                  disabled={cleaningAI}
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 16px',
                    borderRadius: 8,
                    border: aiCleaned ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(105,56,239,0.4)',
                    background: aiCleaned
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))'
                      : 'linear-gradient(135deg, rgba(105,56,239,0.15), rgba(105,56,239,0.08))',
                    color: aiCleaned ? '#10b981' : '#a78bfa',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: cleaningAI ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    width: '100%',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    opacity: cleaningAI ? 0.7 : 1,
                  }}
                >
                  {cleaningAI ? (
                    <>
                      <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#a78bfa', borderTopColor: 'transparent' }} />
                      Cleaning with AI...
                    </>
                  ) : aiCleaned ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Transcript Cleaned
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      Clean with AI
                    </>
                  )}
                </button>
              )}

              {hasTranscript && !aiCleaned && (
                <span className="form-hint" style={{ marginTop: 4 }}>
                  AI will normalize speakers, fix formatting, and extract participants
                </span>
              )}
            </div>
          </div>

          <div className="modal-footer" ref={footerRef} style={{ flexShrink: 0 }}>
            {aiCleaned && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 8,
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                fontSize: '0.78rem', color: '#10b981', fontWeight: 600,
                marginRight: 'auto',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Transcript ready
              </div>
            )}
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              id="create-meeting-submit"
              disabled={loading || !form.title.trim()}
            >
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
