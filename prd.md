# Product Requirements Document: AtelierCode
**Version: 6.0 (FINAL)**  
**Date: 2025-11-16**  
**Product: AtelierCode**  
**Domain: ateliercode.dev**  
**Tagline: Your studio for AI-assisted development**  
**Status: Ready for Development**

---

## 1. Executive Summary

### 1.1 Product Vision

**AtelierCode** is a beautiful desktop application that transforms how developers work with AI coding agents. Just as an artist's atelier is their dedicated creative space, AtelierCode is your dedicated space for the craft of coding with AI—where tools, materials, and process come together beautifully.

AtelierCode wraps command-line AI agents (Claude Code, Aider, GitHub Copilot) in an elegant visual interface that provides:
- **Intelligent project creation** through conversational discovery
- **Real-time visibility** into what your AI agent is doing
- **Built-in code review** without leaving the app
- **Mobile companion** to check progress from anywhere

### 1.2 The Problem

**Current State of AI Coding Tools:**

AI coding agents are powerful but have terrible UX:
- **CLI-only interfaces** - intimidating, hard to use
- **No visibility** - "Is it still working or did it hang?"
- **Scattered workflow** - code review happens in separate tools
- **Desktop-bound** - can't check progress when away from desk
- **Manual setup** - writing PRDs, breaking down tasks takes hours
- **Technical barrier** - have to understand architecture before starting

**Developer Pain Points:**
> "I never know what Claude is actually doing right now."  
> "I have to switch between terminal, VS Code, and GitHub to review code."  
> "I left the house and can't check if my agent finished the task."  
> "Starting a new project means manually planning everything."  
> "I want to use AI agents but the CLI is too intimidating."

### 1.3 The Solution

**AtelierCode Desktop Application**

A native desktop app (Tauri + React) that provides:

**🎨 Beautiful Interface**
- Clean, modern design (inspired by Linear, Cursor, Vercel)
- Real-time agent activity visualization
- Integrated Monaco code editor
- Visual task board
- No more staring at terminal output

**🧙 Intelligent Project Wizard**
- Conversational discovery with Claude
- Asks about your product, not tech stack
- Claude derives appropriate architecture
- Generates comprehensive PRD automatically
- Creates task breakdown
- Get started in minutes, not hours

**👀 Always Informed**
- See exactly what your agent is doing
- File changes appear instantly
- Test results in real-time
- Progress indicators everywhere
- Activity stream of recent actions

**📝 Built-in Code Review**
- Review all changes in Monaco editor
- Side-by-side diffs
- Inline comments
- Approve/reject individual files
- Chat with agent about changes
- Never leave AtelierCode

**📱 Mobile Access**
- Check project status from phone
- Send voice prompts
- Approve code changes
- View agent progress
- Quick actions on the go

### 1.4 Success Metrics

**Launch (Month 3):**
- 1,000 downloads
- 300 active projects created
- 50 paying users ($750 MRR)
- NPS >50
- Product Hunt top 5

**6 Months:**
- 10,000 downloads
- 500 paying users ($7.5K MRR)
- 60% mobile engagement
- Featured in developer publications

**12 Months:**
- 50,000 downloads
- 5,000 paying users ($75K MRR)
- Category leader for AI agent interfaces
- 3+ enterprise pilots

---

## 2. Product Overview

### 2.1 Core Concept
```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ATELIERCODE = Beautiful Desktop App for AI Agents      │
│                                                          │
│  Your Workflow:                                          │
│                                                          │
│  1. Create new project → AtelierCode opens              │
│  2. Chat with Claude about what you're building         │
│     ("A restaurant review platform for mobile users")   │
│  3. Claude asks clarifying questions                     │
│     (features, requirements, user flows)                 │
│  4. Claude generates PRD + recommends tech stack         │
│  5. Claude creates task breakdown                        │
│  6. Pick a task → Claude starts working                  │
│  7. Watch in real-time what Claude is doing             │
│  8. Review code changes in beautiful diff view          │
│  9. Approve → Task complete                              │
│  10. Check progress from phone while away                │
│                                                          │
│  Result: Clarity, control, and craft in AI coding       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Target Users

**Primary: Professional Developers Using AI Agents**
```yaml
Profile:
  - Age: 25-45
  - Role: Full-stack developer, software engineer
  - Already using or curious about AI coding tools
  - Frustrated with CLI-only interfaces
  - Values beautiful, functional software
  - Works from multiple locations
  - Cares about craft and quality

Pain Points:
  - "CLI agents are powerful but clunky"
  - "No visibility into what's happening"
  - "Code review scattered across tools"
  - "Can't work remotely with agents"

Goals:
  - Build better software faster
  - Maintain quality and control
  - Work from anywhere
  - Understand what AI is doing

Tools Currently Using:
  - VS Code or Cursor
  - Claude Code or Aider (maybe)
  - GitHub for code review
  - Linear or Jira for tasks

Size: ~200K developers actively using AI agents
Willingness to Pay: High ($10-20/month)
```

**Secondary: Teams Adopting AI Agents**
```yaml
Profile:
  - Engineering teams (5-50 developers)
  - Exploring AI-assisted development
  - Need standardized workflow
  - Require code review process
  - Want visibility into AI work

Pain Points:
  - "Every dev uses AI differently"
  - "No visibility into what AI did"
  - "Code review process unclear"
  - "Can't collaborate on AI sessions"

Goals:
  - Standardize AI workflow
  - Maintain code quality
  - Enable collaboration
  - Track AI productivity

Size: ~10K teams
Willingness to Pay: Very High ($25-50/user/month)
```

**Tertiary: Developers New to AI Agents**
```yaml
Profile:
  - Heard about AI coding tools
  - Intimidated by CLI complexity
  - Want to try AI coding
  - Need guidance and hand-holding

Pain Points:
  - "Don't know where to start"
  - "Terminal is intimidating"
  - "Worried about breaking things"

Goals:
  - Learn AI-assisted development
  - Build confidence
  - See immediate value

Size: ~2M developers curious about AI
Willingness to Pay: Medium (need to see value first)
```

### 2.3 Competitive Landscape

**Direct Competitors:**
- **None!** No one has built a GUI specifically for AI coding CLI agents

**Indirect Competitors:**

| Product | Category | Strengths | Why AtelierCode Wins |
|---------|----------|-----------|---------------------|
| **VS Code** | IDE | Universal, extensible | AtelierCode is agent-first, better visibility, mobile access |
| **Cursor** | AI IDE | AI-native, popular | Multi-agent support, project wizard, mobile, built-in review |
| **Windsurf (Codeium)** | AI IDE | Free, integrated | Better UX, mobile, project management |
| **GitHub Copilot** | Code completion | Integrated, trusted | Long-running tasks, project context, visual feedback |
| **Replit Agent** | Cloud IDE | Web-based, simple | Desktop-first, works offline, multi-agent, your own setup |
| **Bolt.new** | AI web dev | Fast prototyping | Professional development, any project type, mobile |
| **Claude Code (CLI)** | CLI Agent | Powerful, Anthropic-backed | Beautiful UI, visibility, mobile, code review |
| **Aider (CLI)** | CLI Agent | Fast, pragmatic | GUI, project wizard, mobile, task management |

**Key Differentiators:**

1. ✅ **Only GUI** specifically for wrapping agentic CLI tools
2. ✅ **Conversational project wizard** - discovers product, derives architecture
3. ✅ **Real-time visibility** - always know what's happening
4. ✅ **Built-in code review** - Monaco editor, inline comments, no context switching
5. ✅ **Mobile companion** - check progress, send prompts from phone
6. ✅ **Multi-agent support** - works with any CLI agent (Claude Code, Aider, Copilot, etc.)
7. ✅ **Beautiful craft-focused UX** - designed for clarity and delight
8. ✅ **Desktop-first** - fast, native, works offline

---

## 3. Technical Architecture

### 3.1 System Overview
```
┌─────────────────────────────────────────────────────────┐
│              ATELIERCODE DESKTOP APP                     │
│              (Single Application)                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  FRONTEND (React + TypeScript)                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ UI Components (shadcn/ui + Tailwind)               │ │
│  │ • Project Wizard (conversational flow)             │ │
│  │ • Main Workspace (Overview, Changes, Tasks, Chat)  │ │
│  │ • Monaco Editor (code review, file viewing)        │ │
│  │ • Settings & Configuration                         │ │
│  │                                                    │ │
│  │ State Management (Zustand)                         │ │
│  │ • Project state                                    │ │
│  │ • Agent status & output                            │ │
│  │ • File changes & diffs                             │ │
│  │ • Chat history                                     │ │
│  │ • Task list                                        │ │
│  └────────────────────────────────────────────────────┘ │
│                         │                                │
│                         │ Tauri IPC (Commands/Events)    │
│                         ↓                                │
│  BACKEND (Rust)                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Tauri Core                                         │ │
│  │ • Command handlers (frontend → backend)            │ │
│  │ • Event emitters (backend → frontend)              │ │
│  │ • Window management                                │ │
│  │ • System tray integration                          │ │
│  │                                                    │ │
│  │ Agent Manager                                      │ │
│  │ • Auto-detect installed agents                     │ │
│  │ • Spawn agent processes (PTY)                      │ │
│  │ • Capture stdout/stderr in real-time               │ │
│  │ • Send input to agent stdin                        │ │
│  │ • Parse agent output (detect events)               │ │
│  │ • Monitor process health                           │ │
│  │                                                    │ │
│  │ File System Manager                                │ │
│  │ • Watch project directory for changes              │ │
│  │ • Calculate git diffs                              │ │
│  │ • Read/write files                                 │ │
│  │ • Tree traversal (gitignore-aware)                 │ │
│  │                                                    │ │
│  │ Local Database (SQLite)                            │ │
│  │ • Projects (name, path, agent, status)             │ │
│  │ • Chat history                                     │ │
│  │ • Tasks                                            │ │
│  │ • Code review comments                             │ │
│  │ • Activity logs                                    │ │
│  │                                                    │ │
│  │ WebSocket Client (Optional - Pro tier)             │ │
│  │ • Connect to cloud for sync                        │ │
│  │ • Send project state updates                       │ │
│  │ • Receive commands from mobile                     │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        │
                        │ (Optional - Pro tier only)
                        ↓
            ┌──────────────────────────┐
            │   CLOUD SERVICES         │
            │   (Minimal)              │
            ├──────────────────────────┤
            │                          │
            │ WebSocket Gateway        │
            │ • Relay messages         │
            │ • Desktop ↔ Mobile       │
            │                          │
            │ State Sync Service       │
            │ • Project metadata       │
            │ • Chat history           │
            │ • Task status            │
            │                          │
            │ Voice API                │
            │ • Transcribe audio       │
            │ • Return text            │
            │                          │
            │ Storage (PostgreSQL)     │
            │ • User accounts          │
            │ • Projects (synced)      │
            │ • Device mappings        │
            │                          │
            └──────────────────────────┘
                        │
                        ↓
            ┌──────────────────────────┐
            │   MOBILE WEB APP         │
            │   (Pro tier)             │
            ├──────────────────────────┤
            │                          │
            │ React PWA                │
            │ • View project status    │
            │ • Send prompts           │
            │ • Review code            │
            │ • Voice input            │
            │                          │
            └──────────────────────────┘
```

### 3.2 Technology Stack

**Desktop Application**
```yaml
Framework: Tauri v2
  Why:
    - 90% smaller than Electron (~10MB vs 100MB+)
    - Better performance (native Rust)
    - Lower memory (~50MB vs 150MB+)
    - More secure (no Node.js in production)
    - Native system integration
    - Cross-platform (macOS, Windows, Linux)
  
Frontend:
  Language: TypeScript 5.x
  Framework: React 18
  Build Tool: Vite 5
  UI Library: shadcn/ui (Radix + Tailwind CSS)
  State: Zustand
  Router: React Router v6
  Code Editor: Monaco Editor (@monaco-editor/react)
  Terminal: xterm.js (for raw output if needed)
  Animations: Framer Motion
  Icons: Lucide React
  Markdown: react-markdown
  Diff: diff library
  
  Key Libraries:
    - @tanstack/react-query: Server state
    - date-fns: Date formatting
    - react-hotkeys-hook: Keyboard shortcuts
    - react-virtuoso: Virtualized lists
    - zustand: Client state

Backend (Rust):
  Language: Rust 1.75+
  Framework: Tauri 2.x
  
  Key Crates:
    - tauri: Desktop framework
    - tokio: Async runtime
    - serde: JSON serialization
    - sqlx: SQLite database
    - reqwest: HTTP client (cloud sync)
    - tungstenite: WebSocket client
    - notify: File system watcher
    - which: Binary detection
    - pty-process: PTY for spawning agents
    - regex: Output parsing
    - walkdir: Directory traversal
    - ignore: Gitignore support
    - git2: Git operations (diffs)

Database:
  - SQLite (embedded, local-first)
  - No external database required
  - Optional: PostgreSQL in cloud (Pro tier sync)
```
**Cloud Services (Optional - Pro Tier Only)**
```yaml
WebSocket Gateway:
  - Rust + Axum
  - Relay messages between desktop and mobile
  - Authentication via JWT

Sync Service:
  - Rust + Axum
  - PostgreSQL database
  - Sync project metadata, chat, tasks

Voice API:
  - Python + FastAPI
  - Whisper or similar transcription
  - Return text to client

Hosting:
  - Kubernetes on your Ceph cluster
  - Or: Heroku/Railway for MVP
```

**Mobile Web App (Optional - Pro Tier Only)**
```yaml
Framework: React (PWA)
UI: Tailwind CSS + shadcn/ui
State: Zustand + React Query
Hosting: Vercel or Cloudflare Pages
```

---

## 4. Core Features

### 4.1 Project Creation Wizard

This is the **killer feature** that sets AtelierCode apart.

#### **Philosophy**

The wizard is a **product discovery conversation**, not a technical questionnaire.

**Goals:**
1. Understand what the user wants to build
2. Ask clarifying questions about their product
3. Derive appropriate architecture from requirements
4. Generate comprehensive PRD
5. Create task breakdown
6. Get them building in minutes

**NOT:**
- ❌ Ask about "backend vs frontend"
- ❌ Require technical architecture decisions upfront
- ❌ Make them choose tech stack without context
- ❌ Assume they know what they need

#### **The Question Flow**

Claude asks these questions in natural conversation:

1. **What are you building?** - Understand the product concept
2. **Who will use this? How will they access it?** - Determine if needs backend, mobile, etc.
3. **What can users do?** - List functionality requirements
4. **Any special requirements?** - Capture non-functional requirements
5. **Need any integrations?** - Identify external dependencies
6. **Tech preferences?** (optional) - Honor user's knowledge/preference
7. **Timeline?** - Prioritize features and tech choices
8. **Clarifications** - Follow-up questions based on answers

#### **Claude's Inference Engine**

As the conversation progresses, Claude builds understanding and derives:
```typescript
interface ProjectUnderstanding {
  description: string;
  productType: 'web_app' | 'mobile_app' | 'api' | 'cli' | 'desktop';
  userType: 'public' | 'internal' | 'specific_group';
  accessMethod: 'web' | 'mobile' | 'both' | 'desktop' | 'cli';
  authRequired: boolean;
  features: Feature[];
  
  architecture: {
    needsBackend: boolean;
    needsDatabase: boolean;
    needsAuth: boolean;
    needsFileStorage: boolean;
    needsRealtime: boolean;
    needsMobile: boolean;
  };
}
```

**Example Inference:**
```
User says: "Public app, mostly on phones, users post reviews with photos"

Claude infers:
→ needsBackend: true (remote users)
→ needsDatabase: true (user data, reviews)
→ needsAuth: true (user accounts for reviews)
→ needsFileStorage: true (photos)
→ needsMobile: true (mostly phones)

Claude recommends:
→ Frontend: React (mobile-responsive web app)
→ Backend: Node.js + Express (fast MVP, JS ecosystem)
→ Database: PostgreSQL (relational data, relationships)
→ Storage: Cloudinary (image hosting with optimization)
→ Auth: Auth0 or Firebase Auth (don't rebuild from scratch)
```

#### **Generated PRD**

After the conversation, Claude generates a comprehensive PRD with:

1. Product Overview (what, why, who)
2. User Personas
3. Core Features (detailed specifications)
4. Technical Requirements
5. **Recommended Tech Stack** (with rationale based on requirements)
6. Data Models
7. Architecture Diagram
8. API Endpoints (if applicable)
9. Third-Party Integrations
10. MVP Scope (what to build first)
11. Success Metrics
12. Future Enhancements

---

### 4.2 Main Project Workspace

Once project is created, users spend their time here.

**Tab Structure:**
```
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Overview │ Changes  │  Tasks   │   Chat   │  Files   │   PRD    │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

#### **Overview Tab**

Mission control—see everything at a glance.

Key elements:
- **Agent Status Card** - Shows current activity, real-time progress
- **Stats Panel** - Files changed, tests, tasks, time
- **Needs Attention** - Files waiting for review, failing tests
- **Quick Chat** - Last few messages, quick input

#### **Changes Tab (Code Review)**

Built-in code review without leaving AtelierCode.

Features:
- Side-by-side file tree and diff view
- Monaco editor with syntax highlighting
- Inline comments on specific lines
- Approve/reject individual files
- Chat with agent about changes
- See full context of changes

#### **Tasks Tab**

Visual task board with:
- Priority sections (High, Medium, Low)
- Task cards with details
- Progress tracking
- Dependencies visualization
- Drag-and-drop reordering
- Assign tasks to agent or self

#### **Chat Tab**

Full conversation with Claude:
- Scrollable message history
- Rich formatting (code blocks, markdown)
- Voice input option
- Quick actions
- Context-aware suggestions

#### **Files Tab**

Browse project files:
- Tree view with gitignore support
- Monaco editor for viewing
- Search across files
- Open in external editor
- Terminal access

#### **PRD Tab**

View the generated PRD:
- Nicely formatted markdown
- Table of contents
- Edit and export options
- Version history

---

### 4.3 Agent Integration

**Supported Agents (Launch)**

| Agent | Detection | Status Parsing | Priority |
|-------|-----------|----------------|----------|
| Claude Code | `which claude-code` | Task breakdown, file changes, test results | P0 |
| Aider | `which aider` | File modifications, commits, diffs | P0 |
| GitHub Copilot CLI | `gh copilot --version` | Suggestions, commands | P1 |

**Agent Adapter System**

Each agent has an adapter that:
- Detects if agent is installed
- Spawns the agent process
- Captures and parses output
- Sends input to the agent
- Extracts events (file changes, tests, errors)
- Handles graceful shutdown

**Output Events Parsed:**
- Text output
- File changed (added/modified/deleted)
- Test results (passed/failed)
- Task started/completed
- Errors and warnings
- Prompts for input
- Working status updates

---

### 4.4 Mobile Companion App (Pro Tier)

**Mobile Web App (PWA)**

Features:
- View all projects and their status
- See real-time agent activity
- Send text prompts
- Send voice prompts (with transcription)
- View recent file changes
- Approve/reject changes
- Quick actions (pause, stop, resume)
- Push notifications

**Voice Input Flow:**
1. User taps microphone button
2. Records audio (30-60 seconds)
3. Audio transcribed via API
4. User reviews transcribed text
5. Edits if needed
6. Sends to agent
7. Confirmation and progress updates

---

## 5. Development Roadmap

### 5.1 MVP (Months 1-3)

**Goal:** Launch functional desktop app with core features

**Deliverables:**
- Desktop app (Tauri + React)
- Project wizard with conversational discovery
- Claude Code agent integration
- Main workspace (all tabs)
- Monaco editor (read-only)
- Local SQLite database
- Real-time agent output
- Basic code review
- Task board
- Settings

**Platform Support:**
- macOS (primary)
- Linux (secondary)

**Success Criteria:**
- 100 alpha users onboard successfully
- Complete flow: wizard → task → code review
- <10 critical bugs
- NPS >40

**Timeline:** 12 weeks

---

### 5.2 V1.0 (Months 4-6)

**Goal:** Multi-agent support, mobile access, monetization

**Deliverables:**
- Aider fully supported
- GitHub Copilot support
- Monaco editing (not just viewing)
- Cloud services (auth, sync, voice API)
- Mobile web app (PWA)
- Payment integration (Stripe)
- Windows support
- Auto-updates

**Success Criteria:**
- 1,000 downloads
- 100 paying users ($1.5K MRR)
- 50% mobile engagement
- NPS >50

**Timeline:** 3 months

---

### 5.3 V2.0 (Months 7-12)

**Goal:** Team features, enterprise readiness

**Deliverables:**
- Real-time collaboration
- Team workspaces
- SSO integration
- Advanced analytics
- Self-hosted option (enterprise)
- Native mobile apps (optional)
- Plugin system

**Success Criteria:**
- 10,000 downloads
- 1,000 paying users ($15K MRR)
- 50 team accounts
- 3 enterprise pilots

**Timeline:** 6 months

---

## 6. Pricing & Business Model

### 6.1 Pricing Tiers

**Free Tier - $0/month**
- 1 active project
- 7 days history
- Desktop app
- Community support

**Pro Tier - $15/month**
- Unlimited projects
- Unlimited history
- Mobile access
- Cloud sync
- Voice input
- Priority support

**Team Tier - $30/user/month**
- Everything in Pro
- Real-time collaboration
- Team workspaces
- SSO integration
- Team analytics

**Enterprise Tier - Custom**
- Self-hosted option
- Custom agents
- SLA guarantees
- Dedicated support
- On-site training

---

### 6.2 Revenue Projections

**Conservative:**
- Month 3: $300 MRR
- Month 6: $3,000 MRR
- Month 12: $28,500 MRR ($342K ARR)

**Optimistic:**
- Month 12: $75,000 MRR ($900K ARR)

---

## 7. Go-to-Market Strategy

### 7.1 Pre-Launch
- Landing page (ateliercode.dev)
- Demo video (2 minutes)
- Build in public (Twitter)
- Engage in AI coding communities
- Target: 500 email signups

### 7.2 Launch
- Product Hunt (top 5 goal)
- Hacker News (Show HN)
- Reddit (r/ClaudeAI, r/programming)
- Twitter campaign
- Email waitlist

### 7.3 Growth
- Content marketing (blog, videos)
- Community building (Discord)
- Partnerships (agent creators)
- Paid acquisition (once PMF)

---

## 8. Success Metrics

### 8.1 Product Metrics
- Activation: >60% complete wizard
- Engagement: >20 min avg session
- Retention: >30% Day 7
- Quality: NPS >50

### 8.2 Business Metrics
- MRR growth: 20% month-over-month
- Free to Pro: 10% conversion
- Churn: <5% monthly
- CAC payback: <3 months

---

## 9. Risks & Mitigation

**Product Risks:**
- Agent compatibility breaks → Version detection, automated testing
- Performance with large repos → Optimization, lazy loading
- Wizard doesn't work well → Extensive testing, iterative improvement

**Business Risks:**
- Large player copies → Move fast, build moat, differentiate
- Wrong pricing → Research, A/B test, easy to adjust
- Can't scale costs → Efficient architecture, self-host

**Market Risks:**
- AI agents don't go mainstream → Very low likelihood, trend is clear
- Mobile doesn't resonate → Make it optional, focus on check progress

---

## 10. Team & Organization

### 10.1 Team Structure (Month 12)
- CEO/Founder (You)
- CTO/Co-founder
- 4-5 Engineers
- 1 Designer
- 1-2 Operations (support, community)

Total: 8-9 people

### 10.2 Culture
- Craft & Quality
- User Obsession
- Transparency
- Move Fast
- Sustainable Growth

---

## Document Control

**Version:** 6.0 (FINAL)  
**Status:** ✅ READY FOR DEVELOPMENT  
**Last Updated:** 2025-11-16  
**Author:** Jariah + Claude

---

**Next Steps:**
1. Review and approve PRD
2. Create technical design document
3. Design UI mockups in Figma
4. Set up development environment
5. Begin MVP development

---

# 🎨 AtelierCode
## Your Studio for AI-Assisted Development

**Domain:** ateliercode.dev  
**Status:** Ready to build 🚀