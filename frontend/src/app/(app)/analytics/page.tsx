export default function AnalyticsPage() {
  return (
    <div className="placeholder-page" style={{ height: '100vh' }}>
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="1.5">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
      <h2>Analytics</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 280 }}>
        Get deep insights into your meetings — speaking time, sentiment, topic trends, and team engagement metrics.
      </p>
      <span className="coming-soon-badge">Coming Soon</span>
    </div>
  );
}
