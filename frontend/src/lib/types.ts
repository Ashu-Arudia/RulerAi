// TypeScript types matching backend schemas

export interface TranscriptLine {
  id: number;
  meeting_id: number;
  speaker: string;
  text: string;
  start_time: number;
  end_time: number;
  is_highlighted?: boolean;
}

export interface TranscriptComment {
  id: string;
  line_id: number;
  author: string;
  text: string;
  created_at: string;
}

export interface Soundbite {
  id: string;
  line_id: number;
  meeting_id: number;
  speaker: string;
  text: string;
  start_time: number;
  end_time: number;
}


export interface Chapter {
  title: string;
  timestamp: number;
  description: string;
}

export interface Summary {
  id: number;
  meeting_id: number;
  overview: string;
  key_topics: string[];
  chapters: Chapter[];
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: number;
  meeting_id: number;
  text: string;
  assignee: string | null;
  due_date: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: number;
  title: string;
  date: string;
  duration_seconds: number;
  host: string;
  participants: string[];
  status: 'completed' | 'processing' | 'failed';
  audio_url: string | null;
  thumbnail_color: string;
  channel: string;
  created_at: string;
  updated_at: string;
  action_items: ActionItem[];
  tags: string[];
}

export interface MeetingDetail extends Meeting {
  transcript_lines: TranscriptLine[];
  summary: Summary | null;
}

export interface SearchResult {
  meeting_id: number;
  meeting_title: string;
  meeting_date: string;
  transcript_line_id: number;
  speaker: string;
  text: string;
  start_time: number;
}

export interface CreateMeetingPayload {
  title: string;
  date: string;
  duration_seconds: number;
  host: string;
  participants: string[];
  status: string;
  thumbnail_color: string;
  channel: string;
  transcript_text?: string;
}

export interface UpdateMeetingPayload {
  title?: string;
  date?: string;
  duration_seconds?: number;
  host?: string;
  participants?: string[];
  status?: string;
  channel?: string;
}
