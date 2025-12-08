import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme =
  | 'light'
  | 'dark'
  | 'cupcake'
  | 'bumblebee'
  | 'emerald'
  | 'corporate'
  | 'synthwave'
  | 'retro'
  | 'cyberpunk'
  | 'valentine'
  | 'halloween'
  | 'garden'
  | 'forest'
  | 'aqua'
  | 'lofi'
  | 'pastel'
  | 'fantasy'
  | 'wireframe'
  | 'black'
  | 'luxury'
  | 'dracula'
  | 'cmyk'
  | 'autumn'
  | 'business'
  | 'acid'
  | 'lemonade'
  | 'night'
  | 'coffee'
  | 'winter';

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

// Initialize theme immediately on module load
// This ensures the theme is applied before React renders
const applyInitialTheme = () => {
  try {
    // Try to get persisted theme from localStorage
    const storedData = localStorage.getItem('ateliercode-theme');
    if (storedData) {
      const parsed = JSON.parse(storedData);
      if (parsed?.state?.theme) {
        document.documentElement.setAttribute('data-theme', parsed.state.theme);
        console.log('[ThemeStore] Initial theme applied from localStorage:', parsed.state.theme);
        return;
      }
    }
  } catch (error) {
    console.error('[ThemeStore] Failed to parse stored theme:', error);
  }

  // Fallback to default theme
  const defaultTheme = 'dark';
  document.documentElement.setAttribute('data-theme', defaultTheme);
  console.log('[ThemeStore] Applied default theme:', defaultTheme);
};

// Apply immediately
applyInitialTheme();
