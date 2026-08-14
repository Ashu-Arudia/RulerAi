'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useDemoTourStore, DEMO_TOUR_STEPS } from '@/lib/stores/demoTourStore';
import { useDemoMeetingsStore } from '@/lib/stores/demoMeetingsStore';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function useElementRect(targetId: string | null): SpotlightRect | null {
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  const measure = useCallback(() => {
    if (!targetId) {
      setRect(null);
      return;
    }
    const el = document.getElementById(targetId);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [targetId]);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  return rect;
}

export default function DemoTour() {
  const { active, currentStep, next, skip } = useDemoTourStore();
  const step = DEMO_TOUR_STEPS[currentStep];
  const pad = step?.spotlightPadding ?? 12;
  const rect = useElementRect(active ? (step?.targetId ?? null) : null);
  const calloutRef = useRef<HTMLDivElement>(null);

  // Auto open modal when tour reaches a modal step
  useEffect(() => {
    if (active && step?.autoOpenModal) {
      useDemoMeetingsStore.getState().setShowCreate(true);
    }
  }, [active, step, currentStep]);

  if (!active || !step) return null;

  const isWelcome = step.targetId === null;

  // Build clip-path for the spotlight cutout
  let spotlight: SpotlightRect | null = null;
  if (rect) {
    spotlight = {
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    };
  }

  const clipPath = spotlight
    ? `polygon(
        0% 0%, 100% 0%, 100% 100%, 0% 100%,
        0% 0%,
        ${spotlight.left}px ${spotlight.top}px,
        ${spotlight.left}px ${spotlight.top + spotlight.height}px,
        ${spotlight.left + spotlight.width}px ${spotlight.top + spotlight.height}px,
        ${spotlight.left + spotlight.width}px ${spotlight.top}px,
        ${spotlight.left}px ${spotlight.top}px
      )`
    : undefined;

  // Responsive & Boundary Clamped Positioning
  const computeCalloutStyle = (): React.CSSProperties => {
    const margin = 16;
    const padding = 16;
    const cardWidth = isWelcome ? 400 : 310;
    const cardHeight = isWelcome ? 340 : 200;

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

    // Mobile fallback (< 640px)
    if (vw < 640) {
      return {
        position: 'fixed',
        bottom: padding,
        left: padding,
        right: padding,
        width: 'auto',
        maxWidth: `calc(100vw - ${padding * 2}px)`,
        maxHeight: `calc(85vh - ${padding * 2}px)`,
        overflowY: 'auto',
        zIndex: 10000,
      };
    }

    if (!spotlight || isWelcome) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: cardWidth,
        maxWidth: `calc(100vw - ${padding * 2}px)`,
        maxHeight: `calc(90vh - ${padding * 2}px)`,
        overflowY: 'auto',
        zIndex: 10000,
      };
    }

    let top = 0;
    let left = 0;
    const pos = step.position || 'bottom';

    if (pos === 'bottom') {
      top = spotlight.top + spotlight.height + margin;
      left = spotlight.left + spotlight.width / 2 - cardWidth / 2;
    } else if (pos === 'top') {
      top = spotlight.top - cardHeight - margin;
      left = spotlight.left + spotlight.width / 2 - cardWidth / 2;
    } else if (pos === 'right') {
      top = spotlight.top + spotlight.height / 2 - cardHeight / 2;
      left = spotlight.left + spotlight.width + margin;
    } else { // left
      top = spotlight.top + spotlight.height / 2 - cardHeight / 2;
      left = spotlight.left - cardWidth - margin;
    }

    // Auto flip if overflow
    if (top + cardHeight > vh - padding) {
      top = spotlight.top - cardHeight - margin;
    }
    if (top < padding) {
      top = spotlight.top + spotlight.height + margin;
    }

    if (left + cardWidth > vw - padding) {
      left = vw - cardWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    // Hard clamp
    top = Math.max(padding, Math.min(top, vh - cardHeight - padding));
    left = Math.max(padding, Math.min(left, vw - cardWidth - padding));

    return {
      position: 'fixed',
      top,
      left,
      width: cardWidth,
      maxWidth: `calc(100vw - ${padding * 2}px)`,
      maxHeight: `calc(100vh - ${padding * 2}px)`,
      overflowY: 'auto',
      zIndex: 10000,
    };
  };

  const stepNum = currentStep + 1;
  const total = DEMO_TOUR_STEPS.length;

  return (
    <>
      {/* Dark overlay with spotlight cutout */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'rgba(0, 0, 0, 0.72)',
          clipPath: isWelcome ? undefined : clipPath,
          backdropFilter: 'blur(1.5px)',
          transition: 'clip-path 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && isWelcome) skip();
        }}
      />

      {/* Spotlight border glow */}
      {spotlight && !isWelcome && (
        <div
          style={{
            position: 'fixed',
            top: spotlight.top - 2,
            left: spotlight.left - 2,
            width: spotlight.width + 4,
            height: spotlight.height + 4,
            zIndex: 9999,
            borderRadius: 10,
            border: '2px solid rgba(105, 56, 239, 0.8)',
            boxShadow: '0 0 0 4px rgba(105, 56, 239, 0.2), 0 0 32px rgba(105, 56, 239, 0.4)',
            pointerEvents: 'none',
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      )}

      {/* Callout bubble */}
      <div ref={calloutRef} style={computeCalloutStyle()}>
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1027 0%, #140d27 100%)',
            border: '1px solid rgba(105,56,239,0.4)',
            borderRadius: 16,
            padding: isWelcome ? '24px 22px' : '18px 20px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(105,56,239,0.1)',
            animation: 'tourCalloutIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {isWelcome && (
            <>
              {/* Welcome header */}
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6938ef, #9b59f5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    fontSize: 24,
                    boxShadow: '0 8px 24px rgba(105,56,239,0.4)',
                  }}
                >
                </div>
                <h2
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: '#fff',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {step.title}
                </h2>
              </div>

              {/* ASCII-style callout box */}
              {step.asciiBox && (
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: '#a78bfa',
                    background: 'rgba(105,56,239,0.08)',
                    border: '1px solid rgba(105,56,239,0.25)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    marginBottom: 16,
                    whiteSpace: 'pre',
                    textAlign: 'center',
                    lineHeight: 1.6,
                    overflowX: 'auto',
                  }}
                >
                  {step.asciiBox}
                </div>
              )}

              <p style={{ fontSize: '0.875rem', color: '#c4b5fd', margin: '0 0 20px', textAlign: 'center', lineHeight: 1.6 }}>
                {step.message}
              </p>
            </>
          )}

          {!isWelcome && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6938ef, #9b59f5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {stepNum}
                </div>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                  {step.title}
                </h3>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: '0.84rem', color: '#c4b5fd', lineHeight: 1.55 }}>
                {step.message}
              </p>
            </>
          )}

          {/* Progress dots & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {DEMO_TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === currentStep ? 16 : 5,
                    height: 5,
                    borderRadius: 99,
                    background: i === currentStep ? '#6938ef' : 'rgba(139,92,246,0.3)',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={skip}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(167,139,250,0.6)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: '6px 8px',
                  fontFamily: 'inherit',
                  borderRadius: 6,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#a78bfa')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(167,139,250,0.6)')}
              >
                Skip
              </button>
              <button
                onClick={next}
                style={{
                  background: 'linear-gradient(135deg, #6938ef, #7c3aed)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '7px 16px',
                  borderRadius: 8,
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 12px rgba(105,56,239,0.4)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(105,56,239,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(105,56,239,0.4)';
                }}
              >
                {currentStep === total - 1 ? 'Finish' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tourCalloutIn {
          from { opacity: 0; transform: scale(0.94); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
