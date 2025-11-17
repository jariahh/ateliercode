import { useState } from "react";
import { Home } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";
import ThemeSelector from "@/components/ThemeSelector";
import Mockup1 from "./mockup-1/Workspace";
import Mockup2 from "./mockup-2/Workspace";
import Mockup3 from "./mockup-3/Workspace";
import Mockup4 from "./mockup-4/Workspace";

const mockups = [
  { id: 1, name: "Linear Style", component: Mockup1 },
  { id: 2, name: "VS Code Dark", component: Mockup2 },
  { id: 3, name: "Notion Clean", component: Mockup3 },
  { id: 4, name: "Cyberpunk Edge", component: Mockup4 },
];

export default function MockupSelector() {
  const [selectedMockup, setSelectedMockup] = useState<number | null>(null);
  const { theme } = useThemeStore();

  if (selectedMockup === null) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-8" data-theme={theme}>
        <div className="max-w-6xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">AtelierCode Mockups</h1>
            <p className="text-xl text-base-content/70">
              Choose a layout style to preview different workspace designs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {mockups.map((mockup) => (
              <button
                key={mockup.id}
                onClick={() => setSelectedMockup(mockup.id)}
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all hover:scale-105 cursor-pointer"
              >
                <div className="card-body">
                  <h2 className="card-title text-2xl">
                    <span className="badge badge-primary">Mockup {mockup.id}</span>
                    {mockup.name}
                  </h2>
                  <p className="text-base-content/70">
                    {mockup.id === 1 && "Clean, modern interface inspired by Linear's design"}
                    {mockup.id === 2 && "Dark, code-focused layout like VS Code"}
                    {mockup.id === 3 && "Minimalist, content-first design like Notion"}
                    {mockup.id === 4 && "Bold, vibrant cyberpunk aesthetic"}
                  </p>
                  <div className="card-actions justify-end mt-4">
                    <div className="badge badge-outline">Click to preview</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="text-center">
            <div className="alert alert-info inline-flex max-w-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Each mockup demonstrates different UI patterns for the AtelierCode workspace</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const MockupComponent = mockups.find((m) => m.id === selectedMockup)?.component;

  return (
    <div className="min-h-screen" data-theme={theme}>
      <div className="navbar bg-base-100 border-b border-base-300">
        <div className="flex-1">
          <button
            onClick={() => setSelectedMockup(null)}
            className="btn btn-ghost btn-sm gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Selector
          </button>
        </div>
        <div className="flex-none gap-2">
          <div className="badge badge-lg badge-primary">
            Mockup {selectedMockup}: {mockups.find((m) => m.id === selectedMockup)?.name}
          </div>
          <ThemeSelector />
        </div>
      </div>
      {MockupComponent && <MockupComponent />}
    </div>
  );
}
