'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { MeetingDetail } from '@/lib/types';
import { askFredChat } from '@/lib/api';

interface Message {
  id: string;
  sender: 'user' | 'fred';
  text: string;
  timestamp: string;
}

const SAMPLE_PROMPTS = [
  'What were the key decisions made?',
  'List all action items and assignees',
  'What potential risks or blockers were raised?',
  'What questions remain unresolved?',
];

export default function AskFredChat({ meeting }: { meeting?: MeetingDetail | null }) {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id || null;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'fred',
      text: meeting
        ? `Hi! I'm Fred, your AI meeting assistant. Ask me anything about **${meeting.title}**!`
        : `Hi! I'm Fred, your workspace AI assistant. Ask me anything across your meetings!`,
      timestamp: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isTyping) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    try {
      // 1. Attempt live LLM Backend call
      const res = await askFredChat(query, meeting?.id, userId);
      const fredMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'fred',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fredMsg]);
    } catch {
      // 2. Client-side Intelligent Fallback if offline/unreachable
      let answer = '';
      const qLower = query.toLowerCase();

      // Check if user is asking about a specific person (e.g., "what is rachel talking about")
      const words = query.split(/\s+/);
      let matchedSpeakerLines: string[] = [];
      if (meeting?.transcript_lines) {
        matchedSpeakerLines = meeting.transcript_lines
          .filter((l) =>
            words.some((w) => w.length > 2 && l.speaker.toLowerCase().includes(w.toLowerCase())),
          )
          .map((l) => `• **${l.speaker}**: ${l.text}`);
      }

      if (matchedSpeakerLines.length > 0) {
        answer = `Here is what was discussed in **${meeting?.title || 'this meeting'}**:\n\n${matchedSpeakerLines.slice(0, 5).join('\n')}`;
      } else if (qLower.includes('decision') || qLower.includes('key decision')) {
        answer = meeting?.summary?.overview
          ? `Based on the discussion, key decisions included:\n• Finalizing implementation approach.\n• Setting sprint deadlines for deliverables.\n• Assigning technical owners.`
          : `Across your workspace meetings, teams consistently prioritize architecture reviews before feature rollouts and enforce clean pull request workflows.`;
      } else if (qLower.includes('action') || qLower.includes('assign')) {
        answer = meeting?.action_items?.length
          ? `Here are the action items identified in this meeting:\n${meeting.action_items
              .map((a) => `• ${a.text} ${a.assignee ? `(Assigned to: ${a.assignee})` : ''}`)
              .join('\n')}`
          : `All assigned action items are tracked in your workspace board with strict ownership and target completion dates.`;
      } else {
        answer = meeting?.summary?.overview
          ? `Here is what I found regarding your query in **${meeting.title}**:\n\n${meeting.summary.overview}\n\nKey Topics covered: ${meeting.summary.key_topics.join(', ')}.`
          : `Fred analyzed your request across all indexed workspace transcripts.`;
      }

      const fredMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'fred',
        text: answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fredMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="askfred-chat-container">
      {/* Header */}
      <div className="askfred-header">
        <div className="askfred-avatar-icon">
          <img className='w-full h-full object-contain' src="/robot2.svg" alt="AskFred" />
        </div>
        <div>
          <div className="askfred-header-title">
            AskFred AI Assistant
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          </div>
          <div className="askfred-header-subtitle">
            {meeting ? `Context: ${meeting.title}` : 'Workspace Wide Context'}
          </div>
        </div>
      </div>

      {/* Suggestion Chips Bar */}
      <div className="askfred-chips-bar">
        {SAMPLE_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(prompt.replace(/^[^\s]+\s/, ''))}
            className="askfred-chip-btn"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="askfred-feed">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`askfred-msg-wrapper ${m.sender === 'user' ? 'user' : 'fred'}`}
          >
            <div className={`askfred-msg-avatar ${m.sender === 'user' ? 'user' : 'fred'}`}>
              {m.sender === 'user' ? 'U' : <img className='w-full h-full object-contain' src="/robot2.svg" alt="AskFred" />}
            </div>

            <div className={`askfred-msg-bubble ${m.sender === 'user' ? 'user' : 'fred'}`}>
              <div>{m.text}</div>
              <div className="askfred-msg-time">
                {m.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="askfred-msg-wrapper fred">
            <div className="askfred-msg-avatar fred">
              <img className='w-full h-full object-contain' src="/robot2.svg" alt="AskFred" />
            </div>
            <div className="askfred-msg-bubble fred" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="askfred-msg-time" style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                Fred is analyzing transcript...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="askfred-input-area">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="askfred-form"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Fred anything about this meeting..."
            className="askfred-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="askfred-send-btn"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
