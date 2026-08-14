'use client';

import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';

/* ─── Animated floating orbs background ─────────────────────────────────── */
function FloatingOrb({ style }: { style: React.CSSProperties }) {
  return <div className="landing-orb" style={style} />;
}

/* ─── Stat badge ─────────────────────────────────────────────────────────── */
function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="landing-stat">
      <span className="landing-stat-value">{value}</span>
      <span className="landing-stat-label">{label}</span>
    </div>
  );
}

/* ─── Feature pill ───────────────────────────────────────────────────────── */
function FeaturePill({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="landing-pill">
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    await signIn('google', { callbackUrl: '/meetings' });
  };

  const handleDemo = () => {
    setDemoLoading(true);
    router.push('demo/meetings');
  };

  return (
    <>
      <style>{`
        /* ── Landing page scoped styles ── */
        .landing-root {
          min-height: 100vh;
          width: 100vw;
          background: #0a0614;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* Gradient mesh background */
        .landing-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 50% at 20% -10%, rgba(105,56,239,0.35) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 110%, rgba(168,85,247,0.25) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 50% 50%, rgba(30,8,60,0.8) 0%, transparent 80%);
          pointer-events: none;
        }

        /* Animated grid */
        .landing-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(105,56,239,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(105,56,239,0.06) 1px, transparent 1px);
          background-size: 64px 64px;
          pointer-events: none;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
        }

        /* Floating glassy orbs */
        .landing-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
          animation: orbFloat 8s ease-in-out infinite alternate;
        }

        @keyframes orbFloat {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(20px, -30px) scale(1.08); }
        }

        /* Card */
        .landing-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          padding: 48px 44px 44px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          backdrop-filter: blur(24px);
          box-shadow:
            0 0 0 1px rgba(105,56,239,0.1),
            0 32px 80px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.08);
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .landing-card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Logo */
        .landing-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 32px;
          justify-content: center;
        }

        .landing-logo-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, #6938ef 0%, #9b59f0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(105,56,239,0.4);
          flex-shrink: 0;
        }

        .landing-logo-name {
          font-size: 1.375rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.02em;
        }

        .landing-logo-name span {
          color: #a78bfa;
        }

        /* Headline */
        .landing-headline {
          text-align: center;
          margin-bottom: 8px;
          font-size: 1.625rem;
          font-weight: 700;
          line-height: 1.25;
          background: linear-gradient(135deg, #fff 30%, #c4b5fd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
        }

        .landing-subheadline {
          text-align: center;
          font-size: 0.9rem;
          color: rgba(255,255,255,0.45);
          line-height: 1.6;
          margin-bottom: 32px;
        }

        /* Stats row */
        .landing-stats {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-bottom: 32px;
          padding: 16px 20px;
          background: rgba(105,56,239,0.08);
          border-radius: 14px;
          border: 1px solid rgba(105,56,239,0.15);
        }

        .landing-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .landing-stat-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: #a78bfa;
        }

        .landing-stat-label {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 500;
        }

        /* Divider */
        .landing-stat-sep {
          width: 1px;
          background: rgba(255,255,255,0.08);
          align-self: stretch;
        }

        /* Buttons */
        .landing-btn {
          width: 100%;
          padding: 14px 20px;
          border-radius: 14px;
          font-size: 0.9375rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: none;
          outline: none;
          position: relative;
          overflow: hidden;
        }

        .landing-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: white;
          opacity: 0;
          transition: opacity 0.2s;
          border-radius: inherit;
        }
        .landing-btn:active::after { opacity: 0.06; }

        .landing-btn-google {
          background: #fff;
          color: #1a1a2e;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }

        .landing-btn-google:hover:not(:disabled) {
          background: #f9f9ff;
          box-shadow: 0 8px 28px rgba(0,0,0,0.4);
          transform: translateY(-1px);
        }

        .landing-btn-google:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .landing-btn-demo {
          background: transparent;
          color: rgba(255,255,255,0.75);
          border: 1px solid rgba(255,255,255,0.12);
        }

        .landing-btn-demo:hover:not(:disabled) {
          background: rgba(255,255,255,0.06);
          color: #fff;
          border-color: rgba(255,255,255,0.22);
          transform: translateY(-1px);
        }

        .landing-btn-demo:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .landing-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(105,56,239,0.25);
          border-top-color: #6938ef;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        .landing-btn-google .landing-spinner {
          border-color: rgba(0,0,0,0.15);
          border-top-color: #6938ef;
        }

        /* Separator */
        .landing-sep {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
        }
        .landing-sep-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.08);
        }
        .landing-sep-text {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.3);
          font-weight: 500;
          white-space: nowrap;
        }

        /* Feature pills */
        .landing-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          margin-top: 28px;
        }
        .landing-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 500;
          color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
        }

        /* Footer note */
        .landing-footer-note {
          text-align: center;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.2);
          margin-top: 20px;
          line-height: 1.6;
        }

        /* Demo badge */
        .demo-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
          background: rgba(16,185,129,0.15);
          color: #34d399;
          border: 1px solid rgba(16,185,129,0.2);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .demo-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #34d399;
          animation: pulse 2s ease infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>

      <div className="landing-root">
        {/* Grid overlay */}
        <div className="landing-grid" />

        {/* Floating glassy orbs */}
        <FloatingOrb style={{ width: 400, height: 400, top: -100, left: -120, background: 'rgba(105,56,239,0.18)', animationDuration: '9s' }} />
        <FloatingOrb style={{ width: 300, height: 300, bottom: -80, right: -60, background: 'rgba(168,85,247,0.14)', animationDuration: '11s', animationDelay: '2s' }} />
        <FloatingOrb style={{ width: 200, height: 200, top: '40%', right: '10%', background: 'rgba(99,102,241,0.12)', animationDuration: '7s', animationDelay: '1s' }} />

        {/* Main card */}
        <div className={`landing-card ${mounted ? 'visible' : ''}`}>

          {/* Logo */}
          <div className="landing-logo">
            <div className="landing-logo-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            </div>
            <span className="landing-logo-name">Scaler<span>AI</span></span>
          </div>

          {/* Demo badge */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="demo-badge">
              <div className="demo-dot" />
              Live Product
            </div>
          </div>

          {/* Headline */}
          <h1 className="landing-headline">Your AI Meeting<br />Intelligence Hub</h1>
          <p className="landing-subheadline">
            Transcribe, summarize, and extract action items from every conversation — automatically.
          </p>

          {/* Stats */}
          <div className="landing-stats">
            <StatBadge value="99%" label="Accuracy" />
            <div className="landing-stat-sep" />
            <StatBadge value="3× " label="Faster Notes" />
            <div className="landing-stat-sep" />
            <StatBadge value="50+" label="Integrations" />
          </div>

          {/* Google Login */}
          <button
            id="btn-google-login"
            className="landing-btn landing-btn-google"
            onClick={handleGoogleLogin}
            disabled={googleLoading || demoLoading}
          >
            {googleLoading ? (
              <div className="landing-spinner" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? 'Signing in…' : 'Continue with Google'}
          </button>

          {/* Separator */}
          <div className="landing-sep">
            <div className="landing-sep-line" />
            <span className="landing-sep-text">or explore without login</span>
            <div className="landing-sep-line" />
          </div>

          {/* Demo button */}
          <button
            id="btn-try-demo"
            className="landing-btn landing-btn-demo"
            onClick={handleDemo}
            disabled={googleLoading || demoLoading}
          >
            {demoLoading ? (
              <>
                <div className="landing-spinner" style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#a78bfa' }} />
                Loading demo…
              </>
            ) : (
              <>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Try Demo — No signup needed
              </>
            )}
          </button>

          {/* Feature pills */}
          <div className="landing-pills">
            <FeaturePill icon="✦" text="AI Transcription" />
            <FeaturePill icon="⚡" text="Action Items" />
            <FeaturePill icon="🔒" text="Secure & Private" />
            <FeaturePill icon="📊" text="Analytics" />
          </div>

          {/* Footer note */}
          <p className="landing-footer-note">
            By signing in, you agree to our Terms of Service and Privacy Policy.<br/>
            We never share your data with third parties.
          </p>
        </div>
      </div>
    </>
  );
}
