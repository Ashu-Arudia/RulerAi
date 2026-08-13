import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import { ToastProvider } from '@/components/ui/ToastProvider';

export const metadata: Metadata = {
  title: 'Fireflies — AI Meeting Notes & Transcriptions',
  description: 'Record, transcribe, and analyze your meetings with AI-powered notes, action items, and summaries.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              {children}
            </div>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
