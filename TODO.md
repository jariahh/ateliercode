# AtelierCode - TODO

> Action items and next steps organized by priority and phase

**Last Updated:** 2025-11-16  
**Status:** Pre-Development

---

## 🚨 IMMEDIATE (This Week)

### Planning & Setup
- [ ] **Review and approve PRD**
  - Read through complete PRD
  - Get feedback from advisors/co-founder
  - Make any final adjustments
  
- [ ] **Set up project repository**
  - [x] Create GitHub repo
  - [x] Add documentation (PRD, README, TODO, ROADMAP, ARCHITECTURE)
  - [ ] Add LICENSE file (MIT)
  - [ ] Add .gitignore
  - [ ] Set up branch protection rules
  
- [ ] **Domain and branding**
  - [x] Domain secured (ateliercode.dev)
  - [ ] Set up landing page (simple "coming soon")
  - [ ] Design logo (hire designer or use AI tools)
  - [ ] Create brand guidelines doc
  
- [ ] **Development environment**
  - [ ] Set up Tauri development environment
  - [ ] Create project structure
  - [ ] Set up linting and formatting
  - [ ] Configure build pipeline

---

## 🎯 PHASE 1: MVP PREPARATION (Weeks 1-2)

### Design
- [ ] **Create UI mockups in Figma**
  - [ ] Project wizard flow (all 7 steps)
  - [ ] Main workspace layout
  - [ ] Overview tab
  - [ ] Changes tab (code review)
  - [ ] Tasks tab
  - [ ] Chat tab
  - [ ] Files tab
  - [ ] Settings page
  - [ ] System tray menu
  
- [ ] **Design system**
  - [ ] Color palette
  - [ ] Typography scale
  - [ ] Component library (buttons, inputs, cards)
  - [ ] Icon set
  - [ ] Spacing system
  
### Technical Planning
- [ ] **Architecture deep-dive**
  - [ ] Tauri app structure
  - [ ] IPC communication design
  - [ ] State management strategy
  - [ ] Database schema finalization
  - [ ] Agent adapter interface design
  
- [ ] **Research & Prototypes**
  - [ ] Prototype PTY/process spawning in Rust
  - [ ] Test Claude Code CLI integration
  - [ ] Test Aider CLI integration
  - [ ] Prototype file watcher
  - [ ] Prototype git diff calculation
  
### Team
- [ ] **Recruit first engineer**
  - [ ] Write job description
  - [ ] Post on relevant boards
  - [ ] Interview candidates
  - [ ] Make offer
  
- [ ] **Recruit designer**
  - [ ] Write job description
  - [ ] Post on Dribbble, Behance
  - [ ] Review portfolios
  - [ ] Make offer

---

## 🏗️ PHASE 2: MVP DEVELOPMENT (Weeks 3-12)

### Week 3-4: Foundation
- [ ] **Tauri app shell**
  - [ ] Create Tauri project
  - [ ] Set up React + TypeScript
  - [ ] Configure Vite
  - [ ] Set up Tailwind + shadcn/ui
  - [ ] Implement sidebar layout
  - [ ] Add routing
  
- [ ] **SQLite database**
  - [ ] Set up sqlx
  - [ ] Create schema
  - [ ] Write migrations
  - [ ] Create database abstraction layer
  
- [ ] **Basic state management**
  - [ ] Set up Zustand stores
  - [ ] Project state
  - [ ] UI state
  - [ ] Settings state

### Week 5-6: Project Wizard
- [ ] **Wizard UI**
  - [ ] Step 1: Basic info (name, path, agent)
  - [ ] Step 2: Introduction
  - [ ] Step 3: Discovery chat interface
  - [ ] Step 4: Generating PRD (loading state)
  - [ ] Step 5: Review PRD
  - [ ] Step 6: Generating tasks (loading state)
  - [ ] Step 7: Review tasks
  - [ ] Step 8: Success screen
  
- [ ] **Wizard logic**
  - [ ] Form validation
  - [ ] Agent detection
  - [ ] Directory scanning
  - [ ] Chat message handling
  - [ ] PRD generation (mock for now)
  - [ ] Task generation (mock for now)
  - [ ] Save to database

### Week 7-8: Agent Integration
- [ ] **Agent manager (Rust)**
  - [ ] Agent detection system
  - [ ] PTY process spawning
  - [ ] stdout/stderr capture
  - [ ] stdin input handling
  - [ ] Process health monitoring
  
- [ ] **Claude Code adapter**
  - [ ] Implement AgentAdapter trait
  - [ ] Output parsing (file changes, tests, etc.)
  - [ ] Event emission to frontend
  - [ ] Error handling
  
- [ ] **Aider adapter**
  - [ ] Implement AgentAdapter trait
  - [ ] Output parsing
  - [ ] Event emission
  - [ ] Error handling

### Week 9-10: Main Workspace
- [ ] **Overview tab**
  - [ ] Agent status card
  - [ ] Activity stream
  - [ ] Stats panel
  - [ ] Needs attention panel
  - [ ] Quick chat widget
  
- [ ] **Chat tab**
  - [ ] Message list (virtualized)
  - [ ] Input field
  - [ ] Send message handling
  - [ ] Message formatting (code blocks, markdown)
  - [ ] Quick actions
  
- [ ] **Files tab**
  - [ ] File tree (gitignore-aware)
  - [ ] Monaco editor integration
  - [ ] File content display
  - [ ] Search functionality

### Week 11: Code Review
- [ ] **Changes tab**
  - [ ] File list with status
  - [ ] Monaco diff editor
  - [ ] Approve/reject buttons
  - [ ] Comment system (basic)
  - [ ] Git diff calculation
  
- [ ] **File watcher**
  - [ ] Watch project directory
  - [ ] Detect changes
  - [ ] Calculate diffs
  - [ ] Store in database
  - [ ] Emit events to frontend

### Week 12: Tasks & Polish
- [ ] **Tasks tab**
  - [ ] Task list by priority
  - [ ] Task cards with details
  - [ ] Mark complete
  - [ ] Expand/collapse sections
  
- [ ] **Settings**
  - [ ] General settings
  - [ ] Agent configuration
  - [ ] Appearance (theme)
  - [ ] About page
  
- [ ] **Polish**
  - [ ] Loading states everywhere
  - [ ] Error handling
  - [ ] Empty states
  - [ ] Keyboard shortcuts
  - [ ] System tray integration
  - [ ] Bug fixes
  - [ ] Performance optimization

---

## 🚀 PHASE 3: ALPHA LAUNCH (Week 13)

### Pre-Launch
- [ ] **Testing**
  - [ ] Manual testing (all features)
  - [ ] Test with real projects
  - [ ] Test on macOS
  - [ ] Test on Linux
  - [ ] Fix critical bugs
  
- [ ] **Documentation**
  - [ ] User guide
  - [ ] Getting started tutorial
  - [ ] FAQ
  - [ ] Troubleshooting guide
  
- [ ] **Landing page**
  - [ ] Design and build landing page
  - [ ] Demo video (2 minutes)
  - [ ] Screenshots
  - [ ] Waitlist signup
  - [ ] Deploy to ateliercode.dev
  
### Launch
- [ ] **Alpha release**
  - [ ] Create macOS build
  - [ ] Create Linux build
  - [ ] Upload to GitHub releases
  - [ ] Create download instructions
  
- [ ] **Announce**
  - [ ] Product Hunt submission
  - [ ] Hacker News (Show HN)
  - [ ] Reddit posts (r/ClaudeAI, r/programming)
  - [ ] Twitter thread
  - [ ] Email waitlist
  
- [ ] **Support**
  - [ ] Set up Discord server
  - [ ] Monitor feedback
  - [ ] Respond to issues
  - [ ] Gather testimonials

---

## 📅 PHASE 4: V1.0 (Months 4-6)

### Features
- [ ] GitHub Copilot CLI support
- [ ] Monaco editing (not just viewing)
- [ ] Inline comments in code review
- [ ] Enhanced task management (drag-drop, dependencies)
- [ ] Windows support
- [ ] Auto-updates
- [ ] Performance improvements

### Cloud Services (Pro Tier)
- [ ] User authentication (backend)
- [ ] WebSocket relay server
- [ ] Project sync service
- [ ] Voice transcription API
- [ ] Deploy to Kubernetes

### Mobile Web App
- [ ] React PWA
- [ ] View project status
- [ ] Send prompts (text + voice)
- [ ] Code review on mobile
- [ ] Push notifications

### Business
- [ ] Payment integration (Stripe)
- [ ] Subscription management
- [ ] Pricing page
- [ ] Billing portal
- [ ] Analytics setup

---

## 🎯 PHASE 5: V2.0 (Months 7-12)

### Team Features
- [ ] Real-time collaboration
- [ ] Team workspaces
- [ ] Shared projects
- [ ] Team chat
- [ ] Activity feed
- [ ] SSO integration

### Enterprise
- [ ] Self-hosted deployment option
- [ ] Custom agent support
- [ ] Advanced security features
- [ ] SLA guarantees
- [ ] Enterprise dashboard

### Optional
- [ ] Native iOS app
- [ ] Native Android app
- [ ] Advanced analytics
- [ ] Plugin system

---

## 💡 IDEAS / BACKLOG

### Features to Consider
- [ ] Multiple windows support
- [ ] Project templates
- [ ] Git integration (branch management)
- [ ] Advanced search across all files
- [ ] Command palette (Cmd+K)
- [ ] Themes (light/dark/custom)
- [ ] Export projects
- [ ] Time tracking
- [ ] AI-powered code suggestions (beyond agent)

### Integrations
- [ ] Linear (sync tasks)
- [ ] GitHub (better git integration)
- [ ] Notion (export PRDs)
- [ ] Slack (notifications)
- [ ] Discord (notifications)

### Community
- [ ] Open source agent adapters
- [ ] Plugin SDK
- [ ] Community agent library
- [ ] Template marketplace

---

## 🐛 KNOWN ISSUES

*None yet - MVP not started*

---

## 📝 NOTES

### Important Decisions Made
- **Desktop-first approach** - Focus on desktop app, mobile is optional Pro feature
- **Local-first architecture** - All data stored locally, cloud sync is opt-in
- **Conversational wizard** - Key differentiator, invest heavily in UX
- **Multi-agent from start** - Support Claude Code + Aider in MVP

### Open Questions
- [ ] Should we support Continue.dev in MVP or wait for V1.0?
- [ ] Native mobile apps or PWA sufficient?
- [ ] Self-hosted option: Docker only or also bare metal?
- [ ] Should Free tier have any project limit? (currently 1 project)

### Resources Needed
- **Designer** - UI/UX design, brand, landing page
- **Engineer** - Full-stack (Rust + React)
- **Advisor** - Marketing/GTM
- **Budget** - ~$56K for MVP (3 months)

---

## ✅ COMPLETED

*Nothing yet - just getting started!*

---

**Remember:** Focus on MVP first. Ship fast, gather feedback, iterate. Don't try to build everything at once.

**Next immediate step:** Review PRD with team/advisors, then start UI design in Figma.

🚀 Let's build something beautiful!