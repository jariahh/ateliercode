import { Palette } from "lucide-react";
import { useThemeStore, type Theme } from "@/stores/themeStore";

const themes: { value: Theme; label: string; description: string }[] = [
  { value: "light", label: "Light", description: "Clean and bright" },
  { value: "dark", label: "Dark", description: "Easy on the eyes" },
  { value: "cupcake", label: "Cupcake", description: "Soft and sweet" },
  { value: "cyberpunk", label: "Cyberpunk", description: "Neon and bold" },
  { value: "synthwave", label: "Synthwave", description: "Retro vibes" },
  { value: "forest", label: "Forest", description: "Natural greens" },
  { value: "lofi", label: "Lofi", description: "Calm and minimal" },
  { value: "dracula", label: "Dracula", description: "Classic dark" },
  { value: "bumblebee", label: "Bumblebee", description: "Yellow energy" },
  { value: "emerald", label: "Emerald", description: "Professional green" },
  { value: "corporate", label: "Corporate", description: "Business ready" },
  { value: "retro", label: "Retro", description: "Vintage style" },
  { value: "valentine", label: "Valentine", description: "Pink romance" },
  { value: "aqua", label: "Aqua", description: "Ocean blues" },
  { value: "night", label: "Night", description: "Deep dark" },
  { value: "coffee", label: "Coffee", description: "Warm browns" },
];

export default function ThemeSelector() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-2">
        <Palette className="w-4 h-4" />
        <span className="hidden sm:inline">Theme</span>
      </div>
      <div
        tabIndex={0}
        className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-200 rounded-box w-72 max-h-96 overflow-y-auto mt-2"
      >
        <div className="px-3 py-2 text-xs font-semibold text-base-content/70 uppercase">
          Choose Theme
        </div>
        <div className="grid grid-cols-2 gap-1">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`btn btn-sm justify-start ${
                theme === t.value ? "btn-primary" : "btn-ghost"
              }`}
            >
              <div className="text-left flex-1">
                <div className="font-medium text-xs">{t.label}</div>
                <div className="text-[10px] opacity-60">{t.description}</div>
              </div>
              {theme === t.value && (
                <div className="badge badge-xs badge-primary">✓</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
