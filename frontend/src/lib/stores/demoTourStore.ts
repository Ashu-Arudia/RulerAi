import { create } from 'zustand';

export interface TourStep {
  targetId: string | null;
  title: string;
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  spotlightPadding?: number;
  asciiBox?: string;
  autoOpenModal?: boolean;
}

export const DEMO_TOUR_STEPS: TourStep[] = [
  {
    targetId: null,
    title: 'Welcome to Ruler AI',
    message: 'This guided tour will show you how to create a meeting, clean raw transcript text with AI, and view auto-generated AI notes.',
    position: 'bottom',
    asciiBox: ``,
  },
  {
    targetId: 'demo-nav-meetings',
    title: 'Meeting History',
    message: 'Click "Meetings" anytime in the sidebar to view your meeting history, sample recordings, and uploads.',
    position: 'right',
    spotlightPadding: 6,
  },
  {
    targetId: 'demo-new-meeting-btn',
    title: 'Click "+ New Meeting"',
    message: 'Click "+ New Meeting" to open the creation modal where you can paste raw notes or upload transcripts.',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    targetId: 'meeting-title',
    title: 'Enter Meeting Title',
    message: 'Type a name for your meeting (e.g., "Q4 Roadmap Strategy Sync").',
    position: 'bottom',
    spotlightPadding: 6,
    autoOpenModal: true,
  },
  {
    targetId: 'tour-paste-tab',
    title: 'Paste Raw Notes',
    message: 'Switch to "Paste Text" tab and paste your raw transcript text (e.g., "10:02 AM - Alex: Good morning team...").',
    position: 'top',
    spotlightPadding: 6,
    autoOpenModal: true,
  },
  {
    targetId: 'clean-with-ai-btn',
    title: 'Click "Clean with AI"',
    message: 'Click "Clean with AI" to let Groq LLM filter out filler words, normalize timestamps, and auto-detect participants!',
    position: 'top',
    spotlightPadding: 8,
    autoOpenModal: true,
  },
  {
    targetId: 'create-meeting-submit',
    title: 'Create Meeting',
    message: 'Click "+ Create Meeting" to save your meeting into your workspace.',
    position: 'top',
    spotlightPadding: 8,
    autoOpenModal: true,
  },
  {
    targetId: 'tour-first-meeting-card',
    title: 'Open Your Meeting',
    message: 'Click on your newly created meeting card to view its interactive transcript and AI insights.',
    position: 'bottom',
    spotlightPadding: 10,
  },
  {
    targetId: 'tour-notes-panel',
    title: 'AI-Generated Summary & Intelligence',
    message: 'Ruler AI automatically generates an Executive Summary, Key Topics, Timed Outline Chapters, and Speaker Action Items!',
    position: 'right',
    spotlightPadding: 8,
  },
];

interface TourState {
  active: boolean;
  currentStep: number;
  hasSeenTour: boolean;
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  setStep: (step: number) => void;
}

export const useDemoTourStore = create<TourState>((set, get) => ({
  active: false,
  currentStep: 0,
  hasSeenTour: false,

  start: () => {
    set({ active: true, currentStep: 0 });
  },

  next: () => {
    const { currentStep } = get();
    const nextStep = currentStep + 1;
    if (nextStep >= DEMO_TOUR_STEPS.length) {
      set({ active: false, hasSeenTour: true });
      if (typeof window !== 'undefined') {
        localStorage.setItem('ruler_ai_tour_seen', '1');
      }
    } else {
      set({ currentStep: nextStep });
    }
  },

  prev: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  skip: () => {
    set({ active: false, hasSeenTour: true });
    if (typeof window !== 'undefined') {
      localStorage.setItem('ruler_ai_tour_seen', '1');
    }
  },

  setStep: (step: number) => {
    set({ currentStep: step });
  },
}));
