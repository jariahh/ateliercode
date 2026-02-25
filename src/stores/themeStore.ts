import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'atelier-dark' | 'atelier-light';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'atelier-dark',
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },
      toggleTheme: () => {
        const current = get().theme;
        const next: Theme = current === 'atelier-dark' ? 'atelier-light' : 'atelier-dark';
        set({ theme: next });
        document.documentElement.setAttribute('data-theme', next);
      },
    }),
    {
      name: 'ateliercode-theme',
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    }
  )
);

// Initialize theme immediately on module load
// This ensures the theme is applied before React renders
const applyInitialTheme = () => {
  try {
    const storedData = localStorage.getItem('ateliercode-theme');
    if (storedData) {
      const parsed = JSON.parse(storedData);
      const theme = parsed?.state?.theme;
      // Migrate old themes to new atelier themes
      if (theme && (theme === 'atelier-dark' || theme === 'atelier-light')) {
        document.documentElement.setAttribute('data-theme', theme);
        return;
      }
    }
  } catch {
    // ignore parse errors
  }

  // Fallback: use system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const defaultTheme: Theme = prefersDark ? 'atelier-dark' : 'atelier-light';
  document.documentElement.setAttribute('data-theme', defaultTheme);
};

applyInitialTheme();
