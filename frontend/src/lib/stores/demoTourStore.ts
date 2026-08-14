import { create } from 'zustand';

export interface TourStep {
  targetId: string | null;
  title: string;
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  spotlightPadding?: number;
}

export const DEMO_TOUR_STEPS: TourStep[] = [
  {
    targetId: null,
    title: 'Welcome to Ruler AI \u{1F44B}',
    message: 'This is a guided demo. We will walk you through everything — meetings, transcripts, and AI-powered analysis.',
    position: 'bottom',
  },
  {
    targetId: 'demo-new-meeting-btn',
    title: '\u{1F4C5} Create a Meeting',
    message: 'Click "New Meeting" to add your first entry. You can paste a transcript, pick a sample, or upload a file.',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    targetId: 'demo-meetings-search',
    title: '\u{1F50D} Search Meetings',
    message: 'Use the search bar to quickly find meetings by title, host, or keyword.',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    targetId: 'demo-meetings-sort',
    title: '\u{1F4CA} Sort & Filter',
    message: 'Sort meetings by date, title, or duration — perfect for large workspaces.',
    position: 'bottom',
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
