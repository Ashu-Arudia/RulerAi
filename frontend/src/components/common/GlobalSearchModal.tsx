'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getMeetings, formatRelativeDate, formatTime } from '@/lib/api';
import { Meeting } from '@/lib/types';

interface SearchMatch {
  meetingId: number;
  meetingTitle: string;
  meetingDate: string;
  thumbnailColor: string;
  type: 'title' | 'summary' | 'action_item' | 'transcript';
  snippet: string;
  speaker?: string;
  timestamp?: number;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDemo?: boolean;
}

export default function GlobalSearchModal({ isOpen, onClose, isDemo = false }: GlobalSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setLoading(true);
      getMeetings({})
        .then(setAllMeetings)
        .catch(() => setAllMeetings([]))
        .finally(() => setLoading(false));

      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase().trim();
    const matches: SearchMatch[] = [];

    allMeetings.forEach((m) => {
      // Title match
      if (m.title.toLowerCase().includes(q)) {
        matches.push({
          meetingId: m.id,
          meetingTitle: m.title,
          meetingDate: formatRelativeDate(m.date),
          thumbnailColor: m.thumbnail_color || '#6938ef',
          type: 'title',
          snippet: `Title match: ${m.title}`,
        });
      }

      // Action items match
      m.action_items?.forEach((item) => {
        if (item.text.toLowerCase().includes(q)) {
          matches.push({
            meetingId: m.id,
            meetingTitle: m.title,
            meetingDate: formatRelativeDate(m.date),
            thumbnailColor: m.thumbnail_color || '#6938ef',
            type: 'action_item',
            snippet: item.text,
            speaker: item.assignee ?? undefined,
          });
        }
      });

      // Tags match
      m.tags?.forEach((tag) => {
        if (tag.toLowerCase().includes(q)) {
          matches.push({
            meetingId: m.id,
            meetingTitle: m.title,
            meetingDate: formatRelativeDate(m.date),
            thumbnailColor: m.thumbnail_color || '#6938ef',
            type: 'summary',
            snippet: `Tag: #${tag}`,
          });
        }
      });
    });

    setResults(matches.slice(0, 10));
  }, [query, allMeetings]);

  if (!isOpen) return null;

  const handleSelectMatch = (match: SearchMatch) => {
    const basePath = isDemo ? '/demo/meetings' : '/meetings';
    router.push(`${basePath}/${match.meetingId}`);
    onClose();
  };

  return (
    <div className="modal-overlay z-[9999]" onClick={onClose}>
      <div
        className="modal overflow-hidden p-0 max-w-2xl w-full rounded-2xl shadow-2xl bg-[var(--color-surface)] border border-[var(--color-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-3">
          <svg className="w-5 h-5 text-[var(--color-text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-sm font-medium text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none"
            placeholder="Search across all meetings, transcripts, action items..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="px-2 py-1 text-[0.7rem] font-semibold text-[var(--color-text-tertiary)] bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-md">
            ESC
          </kbd>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto p-2">
          {loading ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-tertiary)]">
              Loading workspace catalog...
            </div>
          ) : !query.trim() ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-tertiary)] space-y-2">
              <div className="text-base font-semibold text-[var(--color-text-secondary)]">Search RulerAI Workspace</div>
              <p>Type keywords to search meeting titles, key topics, speaker names, and action items.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-tertiary)]">
              No results found matching &quot;{query}&quot;
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((match, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectMatch(match)}
                  className="w-full p-3 rounded-xl flex items-center justify-between gap-3 text-left transition-all hover:bg-[var(--color-surface-2)] cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: match.thumbnailColor }}
                    >
                      {match.meetingTitle.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand)] truncate">
                        {match.meetingTitle}
                      </div>
                      <div className="text-[0.72rem] text-[var(--color-text-tertiary)] truncate">
                        {match.snippet}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[0.68rem] px-2 py-0.5 rounded-full bg-[var(--color-surface-3)] text-[var(--color-text-tertiary)] font-medium">
                      {match.type.replace('_', ' ')}
                    </span>
                    <span className="text-[0.7rem] text-[var(--color-text-tertiary)]">
                      {match.meetingDate}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[var(--color-surface-2)] border-t border-[var(--color-border)] flex items-center justify-between text-[0.7rem] text-[var(--color-text-tertiary)]">
          <span>Search tip: Press <kbd className="font-semibold">↑</kbd> <kbd className="font-semibold">↓</kbd> to navigate</span>
          <span>RulerAI Global Index</span>
        </div>
      </div>
    </div>
  );
}
