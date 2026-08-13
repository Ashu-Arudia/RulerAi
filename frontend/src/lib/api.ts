import {
  Meeting,
  MeetingDetail,
  CreateMeetingPayload,
  UpdateMeetingPayload,
  ActionItem,
  SearchResult,
  Summary,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export async function getMeetings(params?: {
  search?: string;
  channel?: string;
  sort?: string;
}): Promise<Meeting[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.channel) query.set('channel', params.channel);
  if (params?.sort) query.set('sort', params.sort);
  const qs = query.toString();
  return request<Meeting[]>(`/meetings${qs ? `?${qs}` : ''}`);
}

export async function getMeeting(id: number): Promise<MeetingDetail> {
  return request<MeetingDetail>(`/meetings/${id}`);
}

export async function createMeeting(data: CreateMeetingPayload): Promise<Meeting> {
  return request<Meeting>('/meetings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMeeting(id: number, data: UpdateMeetingPayload): Promise<Meeting> {
  return request<Meeting>(`/meetings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMeeting(id: number): Promise<void> {
  return request<void>(`/meetings/${id}`, { method: 'DELETE' });
}

export async function uploadTranscript(meetingId: number, file: File): Promise<{ message: string; count: number }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/meetings/${meetingId}/transcript/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

// ─── Action Items ─────────────────────────────────────────────────────────────

export async function getActionItems(meetingId: number): Promise<ActionItem[]> {
  return request<ActionItem[]>(`/action-items/meeting/${meetingId}`);
}

export async function createActionItem(
  meetingId: number,
  data: { text: string; assignee?: string; due_date?: string }
): Promise<ActionItem> {
  return request<ActionItem>(`/action-items/meeting/${meetingId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateActionItem(
  itemId: number,
  data: { text?: string; assignee?: string; due_date?: string; completed?: boolean }
): Promise<ActionItem> {
  return request<ActionItem>(`/action-items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteActionItem(itemId: number): Promise<void> {
  return request<void>(`/action-items/${itemId}`, { method: 'DELETE' });
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export async function getSummary(meetingId: number): Promise<Summary> {
  return request<Summary>(`/summaries/${meetingId}`);
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function globalSearch(q: string): Promise<SearchResult[]> {
  return request<SearchResult[]>(`/transcripts/search/global?q=${encodeURIComponent(q)}`);
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
