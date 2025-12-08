# AtelierCode Plugin Development Guide

This guide explains how to create plugins for AtelierCode.

## Plugin Architecture

AtelierCode supports two types of plugins:

1. **Dynamic Rust Plugins** - Full Rust code with complete control (recommended for complex integrations)
2. **Config-Based Plugins** - Simple TOML configuration (easy for basic CLI wrappers)

## Creating a Dynamic Rust Plugin

### 1. Create a New Rust Library

```bash
cargo new --lib ateliercode-plugin-myagent
cd ateliercode-plugin-myagent
```

### 2. Update Cargo.toml

```toml
[package]
name = "ateliercode-plugin-myagent"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]  # Important: must be a dynamic library

[dependencies]
# Core plugin dependencies (versions should match AtelierCode's)
anyhow = "1.0"
async-trait = "0.1"
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
chrono = "0.4"
uuid = { version = "1.10", features = ["v4", "serde"] }
regex = "1.10"
log = "0.4"

# Add your CLI-specific dependencies here
```

### 3. Implement the AgentPlugin Trait

Create `src/lib.rs`:

```rust
use anyhow::Result;
use async_trait::async_trait;
use std::collections::HashMap;

// These types would come from the AtelierCode SDK (you'll need to copy or link them)
// In a real setup, we'd publish an `ateliercode-plugin-sdk` crate

pub struct MyAgentPlugin {
    // Your plugin state
}

impl MyAgentPlugin {
    pub fn new() -> Self {
        Self {
            // Initialize your plugin
        }
    }
}

#[async_trait]
impl AgentPlugin for MyAgentPlugin {
    fn name(&self) -> &str {
        "my-agent"
    }

    fn display_name(&self) -> &str {
        "My AI Agent"
    }

    fn version(&self) -> &str {
        "0.1.0"
    }

    fn description(&self) -> &str {
        "My custom AI agent integration"
    }

    async fn check_installation(&self) -> Result<bool> {
        // Check if your CLI is installed
        Ok(which::which("my-agent-cli").is_ok())
    }

    async fn get_cli_version(&self) -> Result<String> {
        // Get your CLI version
        todo!()
    }

    async fn validate_settings(&self, settings: &HashMap<String, String>) -> Result<()> {
        // Validate plugin settings
        Ok(())
    }

    async fn start_session(
        &self,
        project_path: &str,
        settings: &HashMap<String, String>,
    ) -> Result<SessionHandle> {
        // Start a new session with your CLI
        todo!()
    }

    async fn resume_session(
        &self,
        cli_session_id: &str,
        project_path: &str,
        settings: &HashMap<String, String>,
    ) -> Result<SessionHandle> {
        // Resume an existing session
        todo!()
    }

    async fn stop_session(&self, handle: &SessionHandle) -> Result<()> {
        // Stop a session
        Ok(())
    }

    async fn get_session_status(&self, handle: &SessionHandle) -> Result<SessionStatus> {
        // Get session status
        todo!()
    }

    async fn send_message(&self, handle: &SessionHandle, message: &str) -> Result<()> {
        // Send a message to your CLI
        todo!()
    }

    async fn read_output(&self, handle: &SessionHandle) -> Result<Vec<OutputChunk>> {
        // Read output from your CLI
        todo!()
    }

    async fn list_sessions(&self, project_path: &str) -> Result<Vec<SessionInfo>> {
        // List available sessions
        Ok(Vec::new())
    }

    async fn get_conversation_history(&self, cli_session_id: &str) -> Result<Vec<HistoryMessage>> {
        // Get conversation history
        Ok(Vec::new())
    }

    fn get_capabilities(&self) -> Vec<PluginCapability> {
        vec![
            PluginCapability::MultiTurn,
            PluginCapability::StreamingOutput,
        ]
    }
}

// Export the plugin constructor (required!)
#[no_mangle]
pub extern "C" fn create_plugin() -> *mut dyn AgentPlugin {
    Box::into_raw(Box::new(MyAgentPlugin::new()))
}
```

### 4. Create plugin.toml

Create a `plugin.toml` file in your repo root:

```toml
[plugin]
name = "my-agent"
display_name = "My AI Agent"
version = "0.1.0"
description = "My custom AI agent integration"
author = "Your Name"
homepage = "https://github.com/yourusername/ateliercode-plugin-myagent"
cli_command = "my-agent-cli"

[capabilities]
session_resume = true
streaming_output = true
tool_use = true
multi_turn = true
file_context = false
thinking = false
```

### 5. Build and Install

```bash
# Build the plugin
cargo build --release

# Copy to AtelierCode plugins directory
# Windows
copy target\release\my_agent.dll %APPDATA%\AtelierCode\plugins\my-agent\

# macOS
cp target/release/libmy_agent.dylib ~/Library/Application\ Support/AtelierCode/plugins/my-agent/

# Linux
cp target/release/libmy_agent.so ~/.config/ateliercode/plugins/my-agent/

# Also copy plugin.toml
copy plugin.toml %APPDATA%\AtelierCode\plugins\my-agent\  # Windows
# or
cp plugin.toml ~/Library/Application\ Support/AtelierCode/plugins/my-agent/  # macOS
# or
cp plugin.toml ~/.config/ateliercode/plugins/my-agent/  # Linux
```

## Creating a Config-Based Plugin

For simple CLI wrappers, you can create a config-only plugin without writing Rust code!

### 1. Create plugin.toml

```toml
[plugin]
name = "my-simple-agent"
display_name = "My Simple Agent"
version = "1.0.0"
description = "Simple CLI wrapper"
cli_command = "my-cli"

[capabilities]
session_resume = false
streaming_output = true
tool_use = false
multi_turn = true

[commands]
start_session = ["my-cli", "--start", "--project", "{project_path}"]
send_message = ["my-cli", "--message", "{message}"]

[output_parsing]
session_id_pattern = "Session: ([a-zA-Z0-9_-]+)"
output_format = "text"
```

### 2. Install

```bash
# Create plugin directory
mkdir %APPDATA%\AtelierCode\plugins\my-simple-agent  # Windows

# Copy plugin.toml
copy plugin.toml %APPDATA%\AtelierCode\plugins\my-simple-agent\
```

That's it! AtelierCode's GenericCliPlugin will handle the rest.

## Plugin Directory Structure

```
%APPDATA%\AtelierCode\plugins\           (Windows)
~/.config/ateliercode/plugins/           (Linux)
~/Library/Application Support/AtelierCode/plugins/  (macOS)
│
├── my-agent/
│   ├── plugin.toml                     (Required: metadata)
│   └── my_agent.dll                    (Optional: dynamic library)
│
├── another-agent/
│   ├── plugin.toml
│   └── libanother_agent.so
│
└── config-only-agent/
    └── plugin.toml                     (Config-based: no library needed)
```

## Testing Your Plugin

1. Place your plugin in the plugins directory
2. Restart AtelierCode
3. Check the logs for "Loaded plugin: your-plugin-name"
4. Your plugin should appear in the agent selection UI

## Plugin SDK (Coming Soon)

We'll publish an `ateliercode-plugin-sdk` crate that contains:
- `AgentPlugin` trait definition
- All data structures (SessionHandle, OutputChunk, etc.)
- Helper utilities
- Testing framework

For now, you'll need to copy the trait definitions from the main AtelierCode repo.

## Examples

Check out these example plugins:
- [ateliercode-plugin-claude](https://github.com/yourusername/ateliercode-plugin-claude) - Claude Code integration
- [ateliercode-plugin-aider](https://github.com/yourusername/ateliercode-plugin-aider) - Aider integration

## Publishing Your Plugin

1. Create a GitHub repo: `ateliercode-plugin-yourname`
2. Include installation instructions in README
3. Tag releases with version numbers
4. Submit to the AtelierCode plugin registry (coming soon)

## Questions?

Join our Discord or open an issue on GitHub!
