# Quick Start Guide - Project Wizard

## TL;DR

```bash
# View the wizard (frontend only, no Tauri)
npm install
npm run dev:ui  # If you added this script to package.json

# OR with full Tauri (requires Rust)
npm install
npm run dev
```

Then open your browser to: http://localhost:5173

---

## What You'll See

### 1. Home Page (Empty State)
- First time? You'll see a welcome screen
- Click "Create Your First Project"

### 2. Project Wizard - 3 Steps

**Step 1: Basic Info**
- Enter project name (min 3 characters)
- Enter project path (for now, just type a path)
- Add description (optional)
- Toggle Git initialization

**Step 2: Choose Agent**
- Select from 4 AI agents
- Claude Code is recommended and "installed"

**Step 3: Review**
- Check your selections
- Click "Create Project"

### 3. Workspace
- You'll be redirected to your new project
- Click "Back" to return home

### 4. Home Page (With Projects)
- See your project in the list
- Click to open it

---

## File Locations

```
src/
├── types/project.ts          # Data types
├── stores/projectStore.ts    # State management
├── components/
│   ├── AgentSelector.tsx     # Agent cards
│   └── FolderPicker.tsx      # Path input
└── pages/
    ├── Home.tsx              # Project list
    ├── ProjectWizard.tsx     # 3-step wizard
    └── Workspace.tsx         # Project view
```

---

## Common Tasks

### Add a New Agent
Edit `src/components/AgentSelector.tsx`:
```typescript
const agents: AgentOption[] = [
  // ... existing agents
  {
    type: 'my-agent',
    name: 'My Agent',
    description: 'My custom agent',
    icon: '🤖',
    installed: false,
  },
];
```

Also update `src/types/project.ts`:
```typescript
export type AgentType =
  | 'claude-code'
  | 'aider'
  | 'github-copilot'
  | 'cursor'
  | 'my-agent';  // Add here
```

### Add a Wizard Step
Edit `src/pages/ProjectWizard.tsx`:
```typescript
const STEPS = [
  // ... existing steps
  { id: 4, label: 'New Step', description: 'Step description' },
];

// Add case in renderStepContent()
case 4:
  return <div>Your new step content</div>;
```

### Customize Theme
The ThemeSelector is in bottom-right corner. Click to change themes!

### Access Project Data
```typescript
import { useProjectStore } from './stores/projectStore';

function MyComponent() {
  const projects = useProjectStore(state => state.projects);
  const createProject = useProjectStore(state => state.createProject);

  // Use them!
}
```

---

## Integration with Backend

### When Tauri Backend is Ready

1. **Install Dependencies** (one-time)
```bash
# Install Rust
https://rustup.rs

# Install Tauri CLI
cargo install tauri-cli
```

2. **Update Folder Picker**
```typescript
// src/components/FolderPicker.tsx
import { open } from '@tauri-apps/plugin-dialog';

const selected = await open({
  directory: true,
  title: 'Select Project Folder',
});
```

3. **Update Project Store**
```typescript
// src/stores/projectStore.ts
import { invoke } from '@tauri-apps/api/core';

createProject: async (input) => {
  const project = await invoke('create_project', { input });
  // ... rest
}
```

4. **Add Rust Commands**
```rust
// src-tauri/src/main.rs
#[tauri::command]
fn create_project(input: CreateProjectInput) -> Result<Project, String> {
  // Create directory, init git, save metadata
}
```

---

## Troubleshooting

### "Cannot find module 'X'"
```bash
npm install
```

### TypeScript errors
```
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Theme not changing
Check browser console. The theme should be stored in localStorage.

### Project not persisting
Open DevTools → Application → Local Storage → Check `ateliercode-projects`

### Wizard validation not working
Check browser console for errors. Make sure all required fields are filled.

---

## Tips

1. **Use Chrome DevTools** - React DevTools extension is helpful
2. **Hot Reload Works** - Save files to see instant updates
3. **Test All Themes** - Make sure your UI works in light/dark modes
4. **Mobile View** - Use DevTools responsive mode to test
5. **Clear State** - Delete localStorage to start fresh

---

## What's Mocked (For Now)

- ✅ Agent installation detection (Claude Code is "installed")
- ✅ Folder picker (shows alert, no native dialog)
- ✅ Project directory creation (not created on filesystem)
- ✅ Git initialization (checkbox works, but doesn't init git)

These will work once the Tauri backend is implemented!

---

## Next Steps After Wizard

1. **Workspace UI** - Build the main workspace interface
2. **Chat Component** - Agent interaction UI
3. **File Explorer** - Project file tree
4. **Code Editor** - Monaco editor integration
5. **Terminal** - Embedded terminal
6. **Git Panel** - Status, diff, commit UI

---

## Resources

- **DaisyUI Docs**: https://daisyui.com/components/
- **Zustand Docs**: https://docs.pmnd.rs/zustand
- **React Router**: https://reactrouter.com
- **Tauri Docs**: https://tauri.app/v1/guides/
- **Lucide Icons**: https://lucide.dev/icons/

---

## Questions?

- Read `WIZARD_SETUP.md` for detailed setup
- Read `docs/wizard-architecture.md` for technical details
- Check component source code (it's commented!)

---

**Happy coding! 🎨**
