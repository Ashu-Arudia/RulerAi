'use client';

import { usePathname, useRouter } from 'next/navigation';

const CHANNELS = [
  { id: 'my', label: 'My Meetings', icon: '👤', channel: 'My Meetings' },
  { id: 'all', label: 'All Meetings', icon: '📋', channel: 'All Meetings' },
  { id: 'voice', label: 'Voice Agent Meetings', icon: '🤖', channel: 'Voice Agent Meetings' },
  { id: 'uploads', label: 'Uploads', icon: '📁', channel: 'Uploads' },
];

export default function MeetingsSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (channel: string) => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const currentChannel = params.get('channel') || 'My Meetings';
      return currentChannel === channel;
    }
    return channel === 'My Meetings';
  };

  const navigate = (channel: string) => {
    router.push(`/meetings?channel=${encodeURIComponent(channel)}`);
  };

  return (
    <aside className="meetings-sidebar">
      <div className="meetings-sidebar-header">
        <div className="meetings-sidebar-title">Meetings</div>
        <div className="meetings-sidebar-search">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder="Search channels..." />
        </div>
      </div>

      <nav className="meetings-sidebar-nav">
        <div className="channel-section-label">Default Channels</div>
        {CHANNELS.map((ch) => (
          <div
            key={ch.id}
            className={`channel-item ${isActive(ch.channel) ? 'active' : ''}`}
            onClick={() => navigate(ch.channel)}
          >
            <span style={{ fontSize: '14px' }}>{ch.icon}</span>
            <span>{ch.label}</span>
          </div>
        ))}

        <div className="channel-section-label" style={{ marginTop: 12 }}>All Channels</div>
        {['Client Calls', 'Engineering Syncs', 'Sales Calls', 'All Meetings'].map((ch) => (
          <div
            key={ch}
            className={`channel-item ${isActive(ch) ? 'active' : ''}`}
            onClick={() => navigate(ch)}
          >
            <svg className="channel-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span>{ch}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}
