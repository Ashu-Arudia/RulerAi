'use client';

export default function SettingsPage() {
  return (
    <div style={{ padding: 32, maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 6 }}>Settings</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 32 }}>
        Manage your account and workspace preferences.
      </p>

      {[
        { title: 'Profile', desc: 'Update your display name, email, and profile photo', icon: '👤' },
        { title: 'Notifications', desc: 'Configure email and in-app notification preferences', icon: '🔔' },
        { title: 'Language & Region', desc: 'Set your preferred language, timezone, and date format', icon: '🌍' },
        { title: 'Integrations', desc: 'Connect Zoom, Google Meet, Slack, and CRM tools', icon: '🔌' },
        { title: 'AI Preferences', desc: 'Customize summary templates and AI behavior', icon: '🤖' },
        { title: 'Billing & Plans', desc: 'Manage your subscription and payment methods', icon: '💳' },
      ].map((item) => (
        <div
          key={item.title}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 16px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 8,
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-brand)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        >
          <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>{item.title}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{item.desc}</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 24, padding: '16px', background: 'var(--color-brand-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-brand-light)' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-brand)', fontWeight: 500 }}>
          🔐 Full authentication and settings management coming soon. Currently running as default user: Sarah Chen.
        </p>
      </div>
    </div>
  );
}
