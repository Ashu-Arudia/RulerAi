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
        boxShadow: '0 8px 28px rgba(105, 56, 239, 0.45), 0 0 0 1px rgba(105, 56, 239, 0.2)',
        fontSize: '0.84rem',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(105, 56, 239, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 8px 28px rgba(105, 56, 239, 0.45)';
      }}
    >
      <span>Start Guided Tour</span>
    </button>
  );
}
