import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',

  setTheme: (theme: Theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('scaler_ai_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(nextTheme);
  },

  initTheme: () => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('scaler_ai_theme') as Theme | null;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        set({ theme: savedTheme });
        document.documentElement.setAttribute('data-theme', savedTheme);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const defaultTheme = prefersDark ? 'dark' : 'light';
        set({ theme: defaultTheme });
        document.documentElement.setAttribute('data-theme', defaultTheme);
      }
    }
  },
}));
