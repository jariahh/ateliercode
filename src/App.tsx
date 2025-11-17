import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
            AtelierCode
          </h1>
          <p className="text-xl text-muted-foreground">
            Your studio for AI-assisted development
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-8 space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-foreground">
              Enter your name
            </label>
            <input
              id="name"
              type="text"
              className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Your name..."
            />
          </div>

          <button
            type="button"
            onClick={greet}
            className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity font-medium"
          >
            Greet
          </button>

          {greetMsg && (
            <div className="mt-4 p-4 bg-secondary rounded-md">
              <p className="text-secondary-foreground">{greetMsg}</p>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Built with Tauri + React + TypeScript</p>
          <p className="mt-2">Ready for development! 🚀</p>
        </div>
      </div>
    </div>
  );
}

export default App;
