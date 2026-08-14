import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'RulerAI — AI-Powered Meeting Intelligence',
  description: 'Record, transcribe, and analyze your meetings with AI-powered notes, action items, and summaries.',
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
