# Project Wizard Setup Guide

## Overview
The Project Creation Wizard is now complete and ready for use. This is the first screen users see when creating a new project in AtelierCode.

## Created Files

### 1. Type Definitions
**Location:** `src/types/project.ts`
- `AgentType`: Union type for supported AI agents (claude-code, aider, github-copilot, cursor)
- `ProjectStatus`: Union type for project states (active, archived, paused)
- `AgentConfig`: Interface for agent configuration
- `Project`: Main project interface with all metadata
- `CreateProjectInput`: Input type for project creation
- `ProjectStats`: Statistics interface for project metrics

### 2. State Management
**Location:** `src/stores/projectStore.ts`
- Zustand store with persistence middleware
- State: `currentProject`, `projects`, `isLoading`, `error`
- Actions:
  - `createProject(input)`: Creates a new project
  - `loadProjects()`: Loads all projects from storage
  - `setCurrentProject(id)`: Sets the active project
  - `updateProject(id, updates)`: Updates project metadata
  - `deleteProject(id)`: Removes a project
  - `archiveProject(id)`: Archives a project
  - `getProject(id)`: Retrieves a specific project

### 3. UI Components

#### AgentSelector
**Location:** `src/components/AgentSelector.tsx`
- Beautiful card-based selection interface
- Shows agent icons, names, descriptions
- Displays installation status (installed/not installed)
- Highlights recommended agent (Claude Code)
- Visual feedback for selected agent
- Warning badges for non-installed agents

#### FolderPicker
**Location:** `src/components/FolderPicker.tsx`
- Text input with browse button
- Ready for Tauri dialog API integration
- Validation support
- Error display
- Help text

### 4. Pages

#### ProjectWizard
**Location:** `src/pages/ProjectWizard.tsx`
- 3-step wizard with progress indicator
- **Step 1: Basic Info**
  - Project name (required, min 3 chars)
  - Project location (required)
  - Description (optional)
  - Git initialization checkbox
- **Step 2: AI Agent**
  - Agent selection with beautiful cards
  - Visual indicators for installed/recommended agents
- **Step 3: Review**
  - Summary of all selections
  - Confirmation before creation
- Form validation at each step
- Back/Next navigation
- Responsive design
- Uses DaisyUI steps component

#### Home
**Location:** `src/pages/Home.tsx`
- Project list/dashboard
- Empty state for first-time users
- Recent projects grid view
- All projects table view
- Quick project access
- Create new project button

#### Workspace
**Location:** `src/pages/Workspace.tsx`
- Placeholder for project workspace
- Displays project metadata
- Shows selected agent
- Back navigation to home

### 5. Routing
**Location:** `src/App.tsx`
- React Router setup
- Routes:
  - `/` - Home page (project list)
  - `/wizard` - Project creation wizard
  - `/workspace/:id` - Project workspace
- Theme selector available on all pages
- 404 handling with redirect to home

## Design Features

### DaisyUI Components Used
- `steps` - Progress indicator
- `card` - Content containers
- `form-control` - Form layouts
- `input` / `textarea` - Text inputs
- `checkbox` - Git initialization option
- `button` / `btn` - Actions
- `badge` - Status indicators
- `alert` - Information messages
- `loading` - Loading states
- `navbar` - Page headers
- `table` - Project lists

### Theme Support
- Fully integrated with existing themeStore
- All 16 DaisyUI themes supported
- Theme persists across pages
- Theme selector available globally

### Responsive Design
- Mobile-first approach
- Grid layouts adapt to screen size
- Touch-friendly card interfaces
- Proper spacing and typography

## Integration Points

### Backend Integration (TODO)
The following areas are marked for backend integration:

1. **File System Operations** (`src/components/FolderPicker.tsx`)
   ```typescript
   // TODO: Replace with Tauri dialog API
   import { open } from '@tauri-apps/plugin-dialog';
   const selected = await open({
     directory: true,
     multiple: false,
     title: 'Select Project Folder',
   });
   ```

2. **Project Creation** (`src/stores/projectStore.ts`)
   ```typescript
   // TODO: Call Tauri backend to create project on filesystem
   import { invoke } from '@tauri-apps/api/core';
   const result = await invoke('create_project', { input });
   ```

3. **Agent Detection** (`src/stores/projectStore.ts`)
   ```typescript
   // TODO: Replace with actual agent detection
   function checkAgentInstalled(agentType: AgentType): boolean {
     // Call Tauri backend to check if agent is installed
     return await invoke('check_agent_installed', { agentType });
   }
   ```

4. **Project Loading** (`src/stores/projectStore.ts`)
   ```typescript
   // TODO: Load projects from backend
   const projects = await invoke('get_projects');
   ```

### Git Integration (TODO)
- Initialize Git repository option
- Detect existing Git repos
- Show Git status in workspace

### Agent Integration (TODO)
- Launch agent processes
- Stream agent output
- Handle agent interactions

## Testing the Wizard

### Prerequisites
To run the full Tauri app:
1. Install Rust: https://www.rust-lang.org/tools/install
2. Install system dependencies (varies by OS)
3. Run: `npm run dev`

### Development Mode (Frontend Only)
For UI development without Tauri:
1. Create a mock dev script in `package.json`:
   ```json
   "dev:ui": "vite"
   ```
2. Run: `npm run dev:ui`
3. Access at: http://localhost:5173

### Manual Testing Checklist
- [ ] Navigate to home page (shows empty state)
- [ ] Click "New Project" button
- [ ] Step 1: Enter project name (test validation)
- [ ] Step 1: Enter project path
- [ ] Step 1: Add description
- [ ] Step 1: Toggle Git initialization
- [ ] Click "Next" to Step 2
- [ ] Step 2: Select different agents (visual feedback)
- [ ] Click "Next" to Step 3
- [ ] Step 3: Review all details
- [ ] Click "Create Project"
- [ ] Verify navigation to workspace
- [ ] Click "Back" to return home
- [ ] Verify project appears in list
- [ ] Test theme switching
- [ ] Test responsive design (resize window)

## Next Steps

### Immediate (Wizard Complete)
✅ Project types defined
✅ Project store implemented
✅ Agent selector component
✅ Folder picker component
✅ Multi-step wizard UI
✅ Form validation
✅ Routing setup
✅ Home page
✅ Workspace placeholder

### Short Term (Backend Integration)
1. Implement Tauri commands for:
   - File system operations (create project directory)
   - Agent detection and installation
   - Project persistence (SQLite or file-based)
   - Git operations

2. Add Rust backend handlers in `src-tauri/src/main.rs`:
   ```rust
   #[tauri::command]
   fn create_project(input: CreateProjectInput) -> Result<Project, String> {
       // Implementation
   }

   #[tauri::command]
   fn check_agent_installed(agent_type: String) -> Result<bool, String> {
       // Implementation
   }
   ```

### Medium Term (Workspace Features)
1. Chat interface for agent interaction
2. File explorer sidebar
3. Code editor integration (Monaco)
4. Terminal emulator
5. Git panel
6. Session history

### Long Term (Advanced Features)
1. Multi-agent support
2. Project templates
3. Workspace layouts
4. Extensions/plugins
5. Cloud sync
6. Team collaboration

## File Structure

```
src/
├── types/
│   ├── project.ts          # Project type definitions
│   └── index.ts            # Type exports
├── stores/
│   ├── projectStore.ts     # Project state management
│   └── themeStore.ts       # Theme state management (existing)
├── components/
│   ├── AgentSelector.tsx   # Agent selection UI
│   ├── FolderPicker.tsx    # Folder selection UI
│   └── ThemeSelector.tsx   # Theme switcher (existing)
├── pages/
│   ├── Home.tsx            # Project list/dashboard
│   ├── ProjectWizard.tsx   # 3-step project creation
│   └── Workspace.tsx       # Project workspace
└── App.tsx                 # Router setup
```

## Key Design Decisions

1. **Zustand over Redux**: Simpler API, better TypeScript support, smaller bundle
2. **DaisyUI Components**: Consistent design system, accessibility, theming
3. **Multi-step Wizard**: Better UX than single long form
4. **Card-based Selection**: Visual, scannable, mobile-friendly
5. **Optimistic UI Updates**: Store updates immediately, backend syncs later
6. **Persistent State**: Projects survive page reloads
7. **Route-based Navigation**: Deep linking, browser history support

## Common Issues & Solutions

### Issue: "Cargo not found"
**Solution:** Install Rust toolchain from https://rustup.rs

### Issue: Types not resolving
**Solution:** Restart TypeScript server in VS Code: Cmd+Shift+P > "TypeScript: Restart TS Server"

### Issue: Theme not applying
**Solution:** Check that `data-theme` attribute is set on `<html>` element

### Issue: Router not working in production
**Solution:** Configure Tauri to handle client-side routing in `tauri.conf.json`

## Accessibility Features

- Semantic HTML elements
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus management in wizard
- Error messages associated with inputs
- Sufficient color contrast (DaisyUI themes)

## Performance Considerations

- Zustand store is lightweight (~1KB)
- Component lazy loading ready
- Form validation runs on change, not on every keystroke
- Project list pagination ready (for large lists)
- Virtual scrolling for file trees (future)

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile: iOS Safari, Chrome Android

## Contributing

When extending the wizard:
1. Follow existing patterns (Zustand for state, DaisyUI for UI)
2. Add TypeScript types for all new features
3. Update this documentation
4. Test with multiple themes
5. Ensure responsive design
6. Add error handling

## Resources

- [DaisyUI Documentation](https://daisyui.com)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Tauri Documentation](https://tauri.app)
- [React Router Documentation](https://reactrouter.com)
