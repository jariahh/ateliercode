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
        console.log('[ThemeStore] Setting theme to:', theme);
        set({ theme });
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', theme);
        console.log('[ThemeStore] data-theme attribute set to:', document.documentElement.getAttribute('data-theme'));
      },
    }),
    {
      name: 'ateliercode-theme',
      onRehydrateStorage: () => (state) => {
        console.log('[ThemeStore] Rehydrating theme store, state:', state);
        // Apply theme when store rehydrates
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme);
          console.log('[ThemeStore] Rehydrated theme applied:', state.theme);
        }
      },
    }
  )
);

// Initialize theme on load (fallback for first load before rehydration)
setTimeout(() => {
  const theme = useThemeStore.getState().theme;
  const currentTheme = document.documentElement.getAttribute('data-theme');
  if (!currentTheme) {
    console.log('[ThemeStore] Initial theme setup:', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }
}, 0);
