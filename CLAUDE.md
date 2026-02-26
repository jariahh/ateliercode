# Claude Development Guidelines

**CRITICAL: Read this before running any commands!**

---

## ⛔ NEVER DO THESE THINGS

### 1. **NEVER Kill All Node Processes**
```bash
# ❌ NEVER DO THIS - Will kill ALL active Claude sessions and other apps
pkill node
killall node
taskkill /F /IM node.exe
kill -9 $(pgrep node)

# ✅ DO THIS INSTEAD - Target specific processes
# Get the specific PID first, then kill only that PID
ps aux | grep "tauri dev"
kill <specific-pid>

# Or use the shell ID from background commands
# (Already available via KillShell tool with shell_id)
```

**Why:** The user may have multiple Claude Code sessions running, other development servers, or critical Node.js applications. Killing all Node processes will terminate everything, including this session and other active Claude sessions.

---

## 🎯 Process Management Best Practices

### Starting Background Processes
- Always use `run_in_background: true` parameter in Bash tool
- Save the shell ID returned
- Use BashOutput tool to monitor progress

### Stopping Background Processes
- **ALWAYS** use the `KillShell` tool with the specific shell ID
- **NEVER** use system-wide kill commands (pkill, killall, taskkill /F /IM)
- If you lose track of the shell ID, ask the user to manually stop the process

### Example - Correct Way:
```
1. Start: Bash tool with run_in_background=true
2. Monitor: BashOutput tool with the returned shell_id
3. Stop: KillShell tool with the shell_id
```

---

## 🚀 Development Server Guidelines

### When Starting `npm run dev` or `tauri dev`:
1. **Always** run in background mode
2. **Monitor** output with BashOutput
3. **Wait** for server to be ready (look for "Local:" or "localhost:" in output)
4. **Only then** open browser or continue

### If Build Fails:
1. Check the BashOutput for errors
2. Use KillShell to stop the specific process
3. Fix the error
4. Try again

### If You Need to Restart:
1. Use KillShell with the original shell_id
2. Start new process with Bash + run_in_background
3. Get new shell_id

---

## 📝 File Operations

### Cargo.toml / package.json Version Updates:
- Version strings must be exact: "2.0.0" or "1.2.3"
- NOT: "2" or "2.0" (unless it's a feature like "1.x")
- Check official docs for compatible versions

### Git Operations:
- Always check `git status` before committing
- Use descriptive commit messages
- Push after successful commits

---

## 🔍 Debugging Tips

### If Tauri Won't Start:
1. Check Cargo.toml versions match package.json versions
2. Verify Rust is installed: `rustc --version`
3. Check if port 1420 is available
4. Look for version mismatch errors in output

### If Vite Won't Start:
1. Check if node_modules exists
2. Run `npm install` if needed
3. Check for port conflicts
4. Verify vite.config.ts is correct

---

## 💡 Remember

- **Be specific** - Target individual processes, never system-wide
- **Be patient** - Builds can take time, especially first run
- **Be careful** - One wrong kill command can terminate everything
- **Ask first** - If unsure about killing a process, ask the user

---

## 🔌 Plugin System Architecture

### Plugin Project Locations
- **Claude Code Plugin**: `C:\projects\ateliercode-plugin-claude`
  - Wraps Claude Code CLI for integration
  - Reads sessions from `~/.claude/sessions/`
- **Gemini Plugin**: `C:\projects\ateliercode-plugin-gemini`
  - Wraps Gemini CLI for integration
  - Reads sessions from `~/.gemini/tmp/{project_hash}/chats/`

### Plugin Build Type
- **Type**: Rust dynamic library (.dll) - separate Cargo projects
- **Key**: Built as `crate-type = ["cdylib"]` in Cargo.toml
- **Install Location**: `%APPDATA%/AtelierCode/plugins/{plugin_name}/`

### How Plugins Work
1. Main app defines `AgentPlugin` trait in `src-tauri/src/plugin.rs`
2. Plugin projects implement this trait
3. Main app loads the compiled `.dll` at runtime via `plugin_manager.rs`
4. Plugin reads CLI session files and returns data to main app

### Dual System Architecture
AtelierCode has TWO systems for agent integration:
1. **AgentManager** (`src-tauri/src/agent_manager.rs`): Direct CLI spawning for active sessions
   - Used by: `start_agent_session`, `send_to_agent`, `read_agent_output`
   - Spawns CLI commands in headless mode per-message
2. **PluginManager** (`src-tauri/src/plugin.rs`): Plugin-based session history
   - Used by: `list_cli_sessions`, `get_chat_history`, `start_watching_session`
   - For browsing historical sessions from CLI storage

### Gemini CLI Notes
- Use positional prompt: `gemini "message"` (NOT deprecated `-p` flag)
- Add `-o text` for text output format
- Add `-y` for yolo mode (auto-approve actions)

---

## 🌐 Monorepo Structure

AtelierCode is a monorepo containing all projects:

```
ateliercode/
├── src/                  # Frontend (React + TypeScript)
├── src-tauri/            # Desktop backend (Rust + Tauri)
├── helm/                 # App Helm chart
├── website/              # Marketing site (ateliercode.dev)
│   ├── src/
│   ├── helm/
│   └── Dockerfile
├── server/               # Auth + signaling server (api.ateliercode.dev)
│   ├── src/
│   ├── helm/
│   └── Dockerfile
└── .github/workflows/
    ├── app-deploy.yml      # Main app CI
    ├── website-deploy.yml  # Website CI
    └── server-deploy.yml   # Server CI
```

### Deployments
- **App (web)**: https://app.ateliercode.dev — Docker + ArgoCD
- **App (desktop)**: Windows/Mac/Linux via Tauri
- **Server**: https://api.ateliercode.dev — Docker + ArgoCD
- **Website**: https://ateliercode.dev — Docker + ArgoCD

### Auth
- **Keycloak OIDC** with PKCE (public client) + JWKS validation (server)
- Realm: `ateliercode` on keycloak.unveiledsoftwaresolutions.com

### Plugins (separate repos)
- **Claude Code Plugin**: `C:\projects\ateliercode-plugin-claude`
  - Rust dynamic library (.dll), reads sessions from `~/.claude/sessions/`

- **Gemini Plugin**: `C:\projects\ateliercode-plugin-gemini`
  - Rust dynamic library (.dll), reads sessions from `~/.gemini/tmp/{project_hash}/chats/`

### Git Remotes
- **origin**: https://git.unveiledsoftwaresolutions.com/jariah/ateliercode.git (Forgejo, primary)
- **github**: https://github.com/jariahh/ateliercode.git (backup mirror)

### Infrastructure
- Kubernetes via ArgoCD on Loft/GKE
- Docker images on GitHub Container Registry (ghcr.io)
- Each sub-project has its own `helm/` chart, Dockerfile, and CI workflow

---

**Last Updated:** 2026-02-25
**Purpose:** Prevent accidental termination of Claude sessions and maintain project context
