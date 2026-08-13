export default function TasksPage() {
  return (
    <div className="placeholder-page" style={{ height: '100vh' }}>
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="1.5">
        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
      <h2>Tasks</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 280 }}>
        View and manage all action items extracted from your meetings, assigned to team members across every call.
      </p>
      <span className="coming-soon-badge">Coming Soon</span>
    </div>
  );
}
