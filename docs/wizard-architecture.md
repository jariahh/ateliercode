# Project Wizard Architecture

## Component Hierarchy

```
App (BrowserRouter)
├── ThemeSelector (Fixed position)
└── Routes
    ├── Home
    │   ├── Navbar
    │   └── ProjectList/EmptyState
    │       └── ProjectCard (multiple)
    │
    ├── ProjectWizard
    │   ├── Steps (Progress indicator)
    │   ├── Step 1: Basic Info
    │   │   ├── NameInput
    │   │   ├── FolderPicker
    │   │   ├── DescriptionTextarea
    │   │   └── GitCheckbox
    │   │
    │   ├── Step 2: Agent Selection
    │   │   └── AgentSelector
    │   │       └── AgentCard (4 agents)
    │   │
    │   ├── Step 3: Review
    │   │   └── SummaryCard
    │   │
    │   └── Navigation (Back/Next/Create)
    │
    └── Workspace
        ├── Header
        │   ├── BackButton
        │   ├── ProjectInfo
        │   └── AgentBadge
        └── MainContent (Coming soon)
```

## Data Flow

```
User Actions → Component State → Zustand Store → LocalStorage
                                       ↓
                                  Backend API (Future)
                                       ↓
                                  File System
```

### Creating a Project

```
1. User fills ProjectWizard form
   ├── Step 1: name, path, description, initGit
   ├── Step 2: agentType
   └── Step 3: review

2. Form validation
   ├── Step 1: name (required, min 3 chars), path (required)
   └── Step 2: agentType (required)

3. Submit → projectStore.createProject()
   ├── Generate project ID (crypto.randomUUID())
   ├── Create Project object
   ├── Add to projects array
   ├── Set as currentProject
   └── Persist to localStorage

4. Navigate to /workspace/:id
   └── Workspace renders project details

5. Future: Backend integration
   ├── Create project directory
   ├── Initialize git (if selected)
   ├── Create .ateliercode config
   ├── Save to database
   └── Setup agent environment
```

## State Management

### projectStore (Zustand)

```typescript
State:
  - currentProject: Project | null
  - projects: Project[]
  - isLoading: boolean
  - error: string | null

Actions:
  - createProject(input) → Project
  - loadProjects() → void
  - setCurrentProject(id) → void
  - updateProject(id, updates) → void
  - deleteProject(id) → void
  - archiveProject(id) → void
  - getProject(id) → Project | undefined

Persistence:
  - localStorage key: 'ateliercode-projects'
  - Persists: projects, currentProject
  - Rehydrates on app load
```

### themeStore (Zustand)

```typescript
State:
  - theme: Theme

Actions:
  - setTheme(theme) → void

Persistence:
  - localStorage key: 'ateliercode-theme'
  - Applies to document.documentElement
```

## Routing

```
/                    → Home (project list)
/wizard              → ProjectWizard (3-step creation)
/workspace/:id       → Workspace (project environment)
*                    → Redirect to /
```

### Route Guards (Future)

```typescript
// Protect workspace route
if (!project) {
  return <Navigate to="/" />;
}

// Check agent installed
if (!project.agent.installed) {
  return <InstallAgentPrompt />;
}
```

## Component Communication

### Props Down, Events Up

```typescript
// Parent → Child (Props)
<AgentSelector
  value={formData.agentType}
  onChange={(agent) => updateFormData('agentType', agent)}
  error={errors.agentType}
/>

// Child → Parent (Callbacks)
onChange(selectedAgent)  // Bubble up selection
```

### Global State (Zustand)

```typescript
// Any component can access/modify
const projects = useProjectStore(state => state.projects);
const createProject = useProjectStore(state => state.createProject);

// Automatic re-render on state change
```

## Validation Strategy

### Client-side Validation

```typescript
// Per-step validation
validateStep(1) → Check name, path
validateStep(2) → Check agentType
validateStep(3) → Final review (all valid)

// Real-time feedback
- Clear error when user types
- Show error on blur or next click
- Block navigation if invalid
```

### Backend Validation (Future)

```typescript
// Server-side checks
- Path exists and writable
- Path not already a project
- Agent actually installed
- Valid git configuration
```

## Error Handling

```typescript
try {
  const project = await createProject(input);
  navigate(`/workspace/${project.id}`);
} catch (error) {
  // Error stored in projectStore.error
  // Display in UI (toast, alert, inline)
  console.error('Failed to create project:', error);
}
```

## Form State Management

```typescript
// Local state in ProjectWizard
const [currentStep, setCurrentStep] = useState(1);
const [formData, setFormData] = useState({
  name: '',
  path: '',
  description: '',
  agentType: null,
  initGit: true,
});
const [errors, setErrors] = useState({});

// Update helpers
updateFormData(field, value) → Update + clear error
validateStep(step) → Return boolean + set errors
```

## Theming

```
User selects theme in ThemeSelector
       ↓
themeStore.setTheme(theme)
       ↓
document.documentElement.setAttribute('data-theme', theme)
       ↓
DaisyUI applies CSS variables
       ↓
All components re-style automatically
```

## Performance Optimizations

### Current
- Zustand selector functions (prevent unnecessary re-renders)
- Form validation debouncing ready
- LocalStorage persistence (fast reads)

### Future
- React.memo for expensive components
- Virtualized lists for many projects
- Code splitting by route
- Image lazy loading
- Service worker caching

## Testing Strategy

### Unit Tests (Future)
```typescript
// Store actions
test('createProject adds to projects array')
test('setCurrentProject updates lastOpenedAt')

// Validation
test('validateStep rejects empty name')
test('validateStep requires agent selection')

// Components
test('AgentSelector highlights selected agent')
test('FolderPicker shows browse button')
```

### Integration Tests (Future)
```typescript
// Wizard flow
test('Complete wizard creates project')
test('Back button preserves form data')
test('Can navigate to created project')
```

### E2E Tests (Future)
```typescript
// Full user journey
test('New user can create first project')
test('Project persists after reload')
test('Theme persists across pages')
```

## Security Considerations

### Current
- No sensitive data in localStorage
- Client-side validation only (not security boundary)

### Future
- Sanitize file paths
- Validate agent commands before execution
- Secure API key storage (system keychain)
- Rate limiting on backend operations
- CSRF protection
- Content Security Policy

## Accessibility (a11y)

### Implemented
- Semantic HTML (`<form>`, `<label>`, `<button>`)
- ARIA labels on custom controls
- Keyboard navigation (Tab, Enter, Escape)
- Focus management in wizard
- Error announcements
- Sufficient color contrast

### Future
- Screen reader testing
- High contrast mode support
- Reduced motion support
- Focus visible indicators
- Skip navigation links

## Internationalization (i18n) - Future

```typescript
// Prepare for multi-language support
const t = useTranslation();

<h2>{t('wizard.title')}</h2>
<p>{t('wizard.step1.description')}</p>
```

## Analytics & Telemetry - Future

```typescript
// Track user interactions (with consent)
- Wizard completion rate
- Most popular agents
- Average time per step
- Error rates
- Theme preferences
```

## Migration Strategy

When backend is ready:

```typescript
// Phase 1: Read from localStorage, write to both
const projects = await loadFromBackend() || loadFromLocalStorage();

// Phase 2: Migrate existing localStorage data
await migrateLocalStorageToBackend();

// Phase 3: Backend only
const projects = await loadFromBackend();
```

## Development Workflow

```bash
# 1. Start development
npm run dev        # Full Tauri app (requires Rust)
npm run dev:ui     # Frontend only (faster iteration)

# 2. Make changes
# Edit component → Hot reload → See changes

# 3. Test in multiple themes
# Use ThemeSelector → Verify appearance

# 4. Build for production
npm run build

# 5. Test production build
npm run preview
```

## Future Enhancements

### Wizard Improvements
- [ ] Save draft projects
- [ ] Project templates (React, Node, Python, etc.)
- [ ] Import existing projects
- [ ] Bulk project creation
- [ ] Wizard presets (quick start)

### Project Management
- [ ] Search/filter projects
- [ ] Sort by name, date, agent
- [ ] Project tags/categories
- [ ] Favorite projects
- [ ] Export/import projects
- [ ] Project statistics dashboard

### Agent Features
- [ ] Multiple agents per project
- [ ] Agent comparison tool
- [ ] Custom agent configurations
- [ ] Agent marketplace
- [ ] Agent performance metrics

### Workspace Features
- [ ] Split panes (editor + chat)
- [ ] File tree sidebar
- [ ] Terminal integration
- [ ] Git integration
- [ ] Extension system
- [ ] Workspace layouts
