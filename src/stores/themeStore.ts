import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme =
  | 'light'
  | 'dark'
  | 'cupcake'
  | 'cyberpunk'
  | 'synthwave'
  | 'forest'
  | 'lofi'
  | 'dracula'
  | 'bumblebee'
  | 'emerald'
  | 'corporate'
  | 'retro'
  | 'valentine'
  | 'aqua'
  | 'night'
  | 'coffee';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', theme);
      },
    }),
    {
      name: 'ateliercode-theme',
      onRehydrateStorage: () => (state) => {
        // Apply theme when store rehydrates
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    }
  )
);

// Initialize theme on load
const theme = useThemeStore.getState().theme;
document.documentElement.setAttribute('data-theme', theme);
