export default function IntegrationsPage() {
  const integrations = [
    { name: 'Zoom', icon: '📹', desc: 'Auto-join and record Zoom meetings', status: 'coming' },
    { name: 'Google Meet', icon: '🎥', desc: 'Transcribe Google Meet calls automatically', status: 'coming' },
    { name: 'Slack', icon: '💬', desc: 'Send meeting summaries to Slack channels', status: 'coming' },
    { name: 'HubSpot', icon: '🟠', desc: 'Sync contacts and deals from your CRM', status: 'coming' },
    { name: 'Salesforce', icon: '☁️', desc: 'Push action items and notes to Salesforce', status: 'coming' },
    { name: 'Google Calendar', icon: '📅', desc: 'Import upcoming meetings from Google Calendar', status: 'coming' },
    { name: 'Notion', icon: '📄', desc: 'Export meeting notes to Notion pages', status: 'coming' },
    { name: 'Zapier', icon: '⚡', desc: 'Connect Fireflies to 5000+ apps via Zapier', status: 'coming' },
  ];

  return (
    <div style={{ padding: 32, maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 6 }}>Integrations</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 32 }}>
        Connect your favorite tools to automate your meeting workflow.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {integrations.map((item) => (
          <div
            key={item.name}
            style={{
              padding: '16px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 3 }}>{item.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>{item.desc}</div>
              <span className="coming-soon-badge">Coming Soon</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
