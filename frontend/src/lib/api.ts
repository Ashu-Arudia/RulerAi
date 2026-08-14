import {
  Meeting,
  MeetingDetail,
  CreateMeetingPayload,
  UpdateMeetingPayload,
  ActionItem,
  SearchResult,
  Summary,
} from './types';

const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BASE_URL = rawBaseUrl.replace(/\/+$/, '');

/**
 * Core fetch wrapper.
 * Pass `userId` to scope the request to an authenticated user's data.
 * Omit `userId` (or pass null/undefined) for demo mode (no X-User-Id header → demo data).
 */
async function request<T>(
  path: string,
  options?: RequestInit,
  userId?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (userId) {
    headers['X-User-Id'] = userId;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(`${BASE_URL}${cleanPath}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export async function getMeetings(
  params?: { search?: string; channel?: string; sort?: string },
  userId?: string | null,
): Promise<Meeting[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.channel) query.set('channel', params.channel);
  if (params?.sort) query.set('sort', params.sort);
  const qs = query.toString();
  return request<Meeting[]>(`/meetings${qs ? `?${qs}` : ''}`, {}, userId);
}

export async function getMeeting(id: number, userId?: string | null): Promise<MeetingDetail> {
  return request<MeetingDetail>(`/meetings/${id}`, {}, userId);
}

export async function createMeeting(
  data: CreateMeetingPayload,
  userId?: string | null,
): Promise<Meeting> {
  return request<Meeting>('/meetings', { method: 'POST', body: JSON.stringify(data) }, userId);
}

export async function updateMeeting(
  id: number,
  data: UpdateMeetingPayload,
  userId?: string | null,
): Promise<Meeting> {
  return request<Meeting>(`/meetings/${id}`, { method: 'PUT', body: JSON.stringify(data) }, userId);
}

export async function deleteMeeting(id: number, userId?: string | null): Promise<void> {
  return request<void>(`/meetings/${id}`, { method: 'DELETE' }, userId);
}

export async function uploadTranscript(
  meetingId: number,
  file: File,
  userId?: string | null,
): Promise<{ message: string; count: number }> {
  const formData = new FormData();
  formData.append('file', file);
  const headers: Record<string, string> = {};
  if (userId) headers['X-User-Id'] = userId;
  const res = await fetch(`${BASE_URL}/meetings/${meetingId}/transcript/upload`, {
    method: 'POST',
    body: formData,
    headers,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

// ─── Action Items ─────────────────────────────────────────────────────────────

export async function getActionItems(
  meetingId: number,
  userId?: string | null,
): Promise<ActionItem[]> {
  return request<ActionItem[]>(`/action-items/meeting/${meetingId}`, {}, userId);
}

export async function createActionItem(
  meetingId: number,
  data: { text: string; assignee?: string; due_date?: string },
  userId?: string | null,
): Promise<ActionItem> {
  return request<ActionItem>(
    `/action-items/meeting/${meetingId}`,
    { method: 'POST', body: JSON.stringify(data) },
    userId,
  );
}

export async function updateActionItem(
  itemId: number,
  data: { text?: string; assignee?: string; due_date?: string; completed?: boolean },
  userId?: string | null,
): Promise<ActionItem> {
  return request<ActionItem>(
    `/action-items/${itemId}`,
    { method: 'PUT', body: JSON.stringify(data) },
    userId,
  );
}

export async function deleteActionItem(itemId: number, userId?: string | null): Promise<void> {
  return request<void>(`/action-items/${itemId}`, { method: 'DELETE' }, userId);
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export async function getSummary(meetingId: number, userId?: string | null): Promise<Summary> {
  return request<Summary>(`/summaries/${meetingId}`, {}, userId);
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function globalSearch(
  q: string,
  userId?: string | null,
): Promise<SearchResult[]> {
  return request<SearchResult[]>(
    `/transcripts/search/global?q=${encodeURIComponent(q)}`,
    {},
    userId,
  );
}

// ─── LLM / Transcript Cleaning ───────────────────────────────────────────────

export interface SampleTranscript {
  id: string;
  title: string;
  description: string;
  duration: string;
  participants: string[];
  filename: string;
}

export interface CleanedLine {
  speaker: string;
  text: string;
  start_time: number;
  end_time: number;
}

export interface CleanTranscriptResult {
  cleaned_lines: CleanedLine[];
  summary_hint: string;
  participant_names: string[];
}

export async function getSampleTranscripts(): Promise<SampleTranscript[]> {
  const res = await fetch(`${BASE_URL}/transcripts/samples`);
  if (!res.ok) throw new Error('Failed to fetch samples');
  return res.json();
}

export async function getSampleTranscriptContent(sampleId: string): Promise<{ content: string; title: string }> {
  const res = await fetch(`${BASE_URL}/transcripts/samples/${sampleId}`);
  if (!res.ok) throw new Error('Failed to fetch sample transcript');
  return res.json();
}

export async function cleanTranscript(rawText: string): Promise<CleanTranscriptResult> {
  const res = await fetch(`${BASE_URL}/transcripts/clean`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_text: rawText }),
  });
  if (!res.ok) throw new Error('Failed to clean transcript');
  return res.json();
}

// ─── Users ───────────────────────────────────────────────────────────────────


export async function upsertUser(data: {
  google_id: string;
  email: string;
  name?: string;
  picture?: string;
}): Promise<{ id: number; google_id: string; email: string; name: string; picture: string }> {
  return request('/users/upsert', { method: 'POST', body: JSON.stringify(data) });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s > 0 ? `${s}s` : ''}`.trim();
  return `${s}s`;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateStr);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const SPEAKER_COLORS = [
  '#6938ef', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ef4444',
];

export function getSpeakerColor(speaker: string): string {
  let hash = 0;
  for (let i = 0; i < speaker.length; i++) {
    hash = speaker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SPEAKER_COLORS[Math.abs(hash) % SPEAKER_COLORS.length];
}
