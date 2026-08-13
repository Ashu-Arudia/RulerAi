export default function AiSkillsPage() {
  return (
    <div className="placeholder-page" style={{ height: '100vh' }}>
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="1.5">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
      <h2>AI Skills</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 280 }}>
        Create and manage custom AI workflows that automatically process your meetings to extract sales signals, coach your team, and more.
      </p>
      <span className="coming-soon-badge">Coming Soon</span>
    </div>
  );
}
