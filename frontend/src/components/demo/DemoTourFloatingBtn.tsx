'use client';

import { useDemoTourStore } from '@/lib/stores/demoTourStore';

export default function DemoTourFloatingBtn() {
  const { active, start } = useDemoTourStore();

  if (active) return null;

  return (
    <button
      id="demo-floating-tour-btn"
      onClick={start}
      title="Replay guided demo tour"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9990,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 18px',
        borderRadius: 99,
        background: 'linear-gradient(135deg, #6938ef 0%, #7c3aed 100%)',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 28px rgba(105, 56, 239, 0.45)',
        fontSize: '0.84rem',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.2s ease',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span>Start Guided Tour</span>
    </button>
  );
}
