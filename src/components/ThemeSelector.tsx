import { Palette, Check } from "lucide-react";
import { useThemeStore, type Theme } from "@/stores/themeStore";

const themes: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "cupcake", label: "Cupcake" },
  { value: "bumblebee", label: "Bumblebee" },
  { value: "emerald", label: "Emerald" },
  { value: "corporate", label: "Corporate" },
  { value: "synthwave", label: "Synthwave" },
  { value: "retro", label: "Retro" },
  { value: "cyberpunk", label: "Cyberpunk" },
  { value: "valentine", label: "Valentine" },
  { value: "halloween", label: "Halloween" },
  { value: "garden", label: "Garden" },
  { value: "forest", label: "Forest" },
  { value: "aqua", label: "Aqua" },
  { value: "lofi", label: "Lofi" },
  { value: "pastel", label: "Pastel" },
  { value: "fantasy", label: "Fantasy" },
  { value: "wireframe", label: "Wireframe" },
  { value: "black", label: "Black" },
  { value: "luxury", label: "Luxury" },
  { value: "dracula", label: "Dracula" },
  { value: "cmyk", label: "CMYK" },
  { value: "autumn", label: "Autumn" },
  { value: "business", label: "Business" },
  { value: "acid", label: "Acid" },
  { value: "lemonade", label: "Lemonade" },
  { value: "night", label: "Night" },
  { value: "coffee", label: "Coffee" },
  { value: "winter", label: "Winter" },
];

export default function ThemeSelector() {
  const { theme, setTheme } = useThemeStore();

  const handleThemeChange = (newTheme: Theme) => {
    console.log('[ThemeSelector] Theme button clicked:', newTheme);
    setTheme(newTheme);
    // Close the dropdown by removing focus
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.blur();
    }
  };

  return (
    <div className="dropdown dropdown-top dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-2">
        <Palette className="w-4 h-4" />
        <span className="hidden sm:inline">Theme</span>
      </div>
      <div
        tabIndex={0}
        className="dropdown-content z-[1] p-3 shadow-lg bg-base-200 rounded-box w-80 max-h-[500px] overflow-y-auto overflow-x-hidden mb-2"
      >
        <div className="px-2 pb-3 text-xs font-semibold text-base-content/70 uppercase">
          Choose Theme
          <br />
          ({themes.length} themes)
        </div>
        <div className="grid grid-cols-2 gap-2">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => handleThemeChange(t.value)}
              data-theme={t.value}
              className={`relative flex flex-col gap-2 p-3 rounded-lg border-2 transition-all ${
                theme === t.value
                  ? "border-primary bg-base-100"
                  : "border-base-300 bg-base-100 hover:border-base-content/30"
              }`}
            >
              {/* Theme color preview */}
              <div className="flex gap-1 h-6">
                <div className="flex-1 rounded bg-primary"></div>
                <div className="flex-1 rounded bg-secondary"></div>
                <div className="flex-1 rounded bg-accent"></div>
                <div className="flex-1 rounded bg-neutral"></div>
              </div>

              {/* Theme name */}
              <div className="text-xs font-medium text-base-content text-left">
                {t.label}
              </div>

              {/* Checkmark for selected theme */}
              {theme === t.value && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-content" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
