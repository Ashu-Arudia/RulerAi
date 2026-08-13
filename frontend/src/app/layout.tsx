import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/ToastProvider';
import SessionProvider from '@/components/providers/SessionProvider';

export const metadata: Metadata = {
  title: 'ScalerAI — AI Meeting Intelligence',
  description: 'Record, transcribe, and analyze your meetings with AI-powered notes, action items, and summaries.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
