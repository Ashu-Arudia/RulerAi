'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { upsertUser, getMeetings } from '@/lib/api';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [meetingCount, setMeetingCount] = useState<number | null>(null);
  const [registering, setRegistering] = useState(false);

  const userId = (session?.user as { id?: string })?.id;

  // Redirect unauthenticated visitors back to landing
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, router]);

  // Upsert user in backend on first visit + fetch their meeting count
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user || !userId) return;
    const user = session.user as { id: string; email?: string | null; name?: string | null; image?: string | null };

    const register = async () => {
      setRegistering(true);
      try {
        await upsertUser({
          google_id: user.id,
          email: user.email ?? '',
          name: user.name ?? undefined,
          picture: user.image ?? undefined,
        });
        const meetings = await getMeetings({}, user.id);
        setMeetingCount(meetings.length);
      } catch {
        setMeetingCount(0);
      } finally {
        setRegistering(false);
      }
    };

    register();
  }, [status, session, userId]);

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto 12px' }} />
          <div className="skeleton" style={{ width: 200, height: 16, borderRadius: 8, margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  if (!session) return null;

  const user = session.user as { id: string; email?: string | null; name?: string | null; image?: string | null };
  const firstName = user.name?.split(' ')[0] ?? 'there';
  const initials = (user.name ?? user.email ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: '48px 24px' }}>

      <div style={{ width: '100%', maxWidth: 640, textAlign: 'center' }}>

        {/* Avatar */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
          {user.image ? (
            <img
              src={user.image}
              alt={user.name ?? 'User'}
              style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid var(--color-brand-light)' }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6938ef 0%, #9b59f0 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 700, color: 'white',
              boxShadow: '0 8px 24px rgba(105,56,239,0.35)',
            }}>
              {initials}
            </div>
          )}
          {/* Online dot */}
          <div style={{
            position: 'absolute', bottom: 3, right: 3,
            width: 14, height: 14, borderRadius: '50%',
            background: '#10b981', border: '2px solid white',
          }} />
        </div>

        {/* Welcome headline */}
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>
          Welcome, {firstName}! 👋
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', marginBottom: 40, lineHeight: 1.6 }}>
          Your workspace is ready. Start recording meetings and let AI handle the notes.
        </p>

        {/* Zero-state stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40,
        }}>
          {[
            { label: 'Meetings Recorded', value: meetingCount === null ? '—' : meetingCount, icon: '🎙️' },
            { label: 'Action Items', value: '0', icon: '⚡' },
            { label: 'Hours Saved', value: '0h', icon: '⏳' },
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: '20px 16px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{stat.icon}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-brand)', marginBottom: 4 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            id="home-new-meeting-btn"
            className="topbar-btn topbar-btn-primary"
            style={{ padding: '12px 28px', fontSize: '0.9375rem', borderRadius: 12 }}
            onClick={() => router.push('/meetings')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
            Record First Meeting
          </button>
          <button
            id="home-meetings-btn"
            className="topbar-btn topbar-btn-ghost"
            style={{ padding: '12px 28px', fontSize: '0.9375rem', borderRadius: 12 }}
            onClick={() => router.push('/meetings')}
          >
            Go to Meetings
          </button>
        </div>

        {/* Account info */}
        <div style={{
          marginTop: 48,
          padding: '16px 20px',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textAlign: 'left',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {user.name}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>
              {user.email}
            </div>
          </div>
          <button
            id="home-signout-btn"
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-error-light)'; e.currentTarget.style.color = 'var(--color-error)'; e.currentTarget.style.borderColor = 'var(--color-error)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
