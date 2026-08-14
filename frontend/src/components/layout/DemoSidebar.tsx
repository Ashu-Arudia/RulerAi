'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useDemoTourStore } from '@/lib/stores/demoTourStore';

const NAV_ITEMS = [
  {
    id: 'meetings',
    label: 'Meetings',
    href: '/demo/meetings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'tasks',
    label: 'Tasks',
    href: '/demo/tasks',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/demo/analytics',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

export default function DemoSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { start } = useDemoTourStore();

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside className="sidebar-icon" style={{ position: 'relative' }}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" />
        </svg>
      </div>

      {/* Demo badge */}
      <div
        title="You're in demo mode"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 18,
          borderRadius: 99,
          background: 'rgba(245,158,11,0.15)',
          border: '1px solid rgba(245,158,11,0.3)',
          fontSize: '0.6rem',
          fontWeight: 700,
          color: '#f59e0b',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        Demo
      </div>

      {/* Nav */}
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.id}
          id={`demo-nav-${item.id}`}
          href={item.href}
          className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`}
        >
          {item.icon}
          <span className="tooltip">{item.label}</span>
        </Link>
      ))}

      <div className="sidebar-spacer" />

      {/* Tour Guide Button */}
      <button
        id="demo-tour-btn"
        onClick={start}
        title="Start guided tour"
        className="sidebar-nav-item"
        style={{
          background: 'rgba(105,56,239,0.08)',
          color: 'var(--color-brand)',
          border: 'none',
          cursor: 'pointer',
          marginBottom: 4,
          position: 'relative',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className="tooltip">Guided Tour</span>
      </button>

      {/* Sign In CTA */}
      <button
        onClick={() => signIn('google', { callbackUrl: '/home' })}
        title="Sign in to save your data"
        className="sidebar-nav-item"
        style={{
          background: 'rgba(105,56,239,0.1)',
          color: 'var(--color-brand)',
          border: 'none',
          cursor: 'pointer',
          marginBottom: 4,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        <span className="tooltip">Sign In</span>
      </button>
    </aside>
  );
}
