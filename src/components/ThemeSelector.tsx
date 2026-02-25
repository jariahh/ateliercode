import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";

export default function ThemeSelector() {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'atelier-dark';

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-ghost btn-sm gap-2"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
