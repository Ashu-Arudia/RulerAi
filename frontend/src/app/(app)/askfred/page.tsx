export default function AskFredPage() {
  return (
    <div className="placeholder-page" style={{ height: '100vh' }}>
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <h2>AskFred</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 280 }}>
        Your AI meeting assistant. Ask Fred any question about your meetings, get summaries, find decisions, and surface action items instantly.
      </p>
      <span className="coming-soon-badge">Coming Soon</span>
    </div>
  );
}
