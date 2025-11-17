# AtelierCode

> Your studio for AI-assisted development

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/Status-In%20Development-orange)]()
[![PRD](https://img.shields.io/badge/PRD-Complete-green)](./PRD.md)

## 🎨 What is AtelierCode?

AtelierCode is a beautiful desktop application that transforms how developers work with AI coding agents. Just as an artist's atelier is their dedicated creative space, AtelierCode is your dedicated space for the craft of coding with AI.

**The Problem:** AI coding tools like Claude Code, Aider, and GitHub Copilot are powerful but have terrible UX. They're CLI-only, provide no visibility into what's happening, and lock you to your desk.

**The Solution:** A native desktop app that wraps these agents in an elegant interface with real-time visibility, built-in code review, and mobile access.

---

## ✨ Key Features

### 🧙 Intelligent Project Wizard
- **Conversational discovery** - Chat with Claude about what you're building
- **Automatic PRD generation** - Claude creates a comprehensive product requirements document
- **Smart tech recommendations** - Claude suggests the right tech stack based on your needs
- **Task breakdown** - Automatically generates prioritized task list

### 👀 Real-Time Visibility
- See exactly what your AI agent is doing right now
- Live file change notifications
- Test results as they happen
- Activity stream of recent actions
- Progress indicators everywhere

### 📝 Built-In Code Review
- Review all changes in Monaco editor
- Side-by-side diffs
- Inline comments and discussions
- Approve/reject individual files
- Never leave AtelierCode

### 🤖 Multi-Agent Support
- **Claude Code** - Anthropic's powerful coding agent
- **Aider** - Fast, pragmatic AI pair programmer
- **GitHub Copilot CLI** - GitHub's AI assistant
- More coming soon!

### 📱 Mobile Companion (Pro)
- Check project status from your phone
- Send prompts (text or voice)
- Approve code changes
- View agent progress on the go

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** (for development)
- **Rust 1.75+** (for Tauri)
- **One or more AI agents installed:**
  - [Claude Code](https://docs.claude.com/claude-code)
  - [Aider](https://github.com/paul-gauthier/aider)
  - [GitHub Copilot CLI](https://github.com/github/gh-copilot)

### Installation

**Option 1: Download Release (Recommended)**

Coming soon! Check [Releases](https://github.com/yourusername/ateliercode/releases) when available.

**Option 2: Build from Source**
```bash
# Clone the repository
git clone https://github.com/yourusername/ateliercode.git
cd ateliercode

# Install dependencies
npm install

# Build and run
npm run tauri dev
```

---

## 📖 Documentation

- **[Product Requirements Document](./PRD.md)** - Complete product specification
- **[Roadmap](./ROADMAP.md)** - Development timeline and milestones
- **[Architecture](./ARCHITECTURE.md)** - Technical architecture overview
- **[TODO](./TODO.md)** - Current tasks and priorities

---

## 🏗️ Tech Stack

**Desktop App:**
- **Framework:** Tauri v2 (Rust + Web)
- **Frontend:** React 18 + TypeScript
- **UI:** shadcn/ui + Tailwind CSS
- **Editor:** Monaco Editor
- **State:** Zustand
- **Database:** SQLite (local)

**Cloud Services (Optional - Pro tier):**
- **Backend:** Rust + Axum
- **Database:** PostgreSQL
- **Sync:** WebSocket + Redis
- **Voice:** Python + FastAPI (Whisper)

---

## 🗺️ Roadmap

### MVP (Months 1-3) - Q1 2025
- ✅ Desktop app shell (Tauri + React)
- ✅ Project wizard with conversational discovery
- ✅ Claude Code integration
- ✅ Main workspace (Overview, Changes, Tasks, Chat, Files tabs)
- ✅ Monaco editor (read-only)
- ✅ Local SQLite database
- ✅ Basic code review

**Target:** 100 alpha users, Product Hunt launch

### V1.0 (Months 4-6) - Q2 2025
- Multi-agent support (Aider, GitHub Copilot)
- Monaco editing (full capabilities)
- Cloud services (auth, sync, voice API)
- Mobile web app (PWA)
- Payment integration
- Windows support

**Target:** 1,000 downloads, 100 paying users

### V2.0 (Months 7-12) - Q3-Q4 2025
- Real-time collaboration
- Team features
- Enterprise (self-hosted)
- Native mobile apps (optional)
- Advanced analytics

**Target:** 10,000 downloads, 1,000 paying users

---

## 💰 Pricing

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | 1 project, 7 days history, desktop only |
| **Pro** | $15/mo | Unlimited projects, mobile access, voice input, cloud sync |
| **Team** | $30/user/mo | Collaboration, team workspaces, SSO |
| **Enterprise** | Custom | Self-hosted, custom agents, SLA, dedicated support |

---

## 🤝 Contributing

We're not accepting contributions yet as we're in early development, but we will open up soon!

**Interested in contributing?**
- Star this repo to stay updated
- Join our [Discord](https://discord.gg/ateliercode) (coming soon)
- Follow [@ateliercode](https://twitter.com/ateliercode) on Twitter (coming soon)

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with love for the AI coding community.

Special thanks to:
- [Claude](https://www.anthropic.com/claude) by Anthropic
- [Aider](https://github.com/paul-gauthier/aider) by Paul Gauthier
- [Tauri](https://tauri.app) team
- [shadcn/ui](https://ui.shadcn.com) by shadcn

---

## 📬 Contact

- **Website:** [ateliercode.dev](https://ateliercode.dev) (coming soon)
- **Email:** hello@ateliercode.dev (coming soon)
- **Twitter:** [@ateliercode](https://twitter.com/ateliercode) (coming soon)
- **Discord:** [Join our community](https://discord.gg/ateliercode) (coming soon)

---

## 🎯 Vision

We believe AI coding agents will transform software development, but only if they have UIs that match their power. AtelierCode is our attempt to bring craft, clarity, and beauty to AI-assisted development.

**Let's build something beautiful together.** 🎨

---

Made with ❤️ by [Jariah](https://github.com/jariahh)

⭐ **Star this repo** if you're excited about better UX for AI coding tools!