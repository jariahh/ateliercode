// Agent Plugin System
// Defines the trait and interfaces for CLI wrapper plugins

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Plugin Trait
// ============================================================================

#[async_trait]
pub trait AgentPlugin: Send + Sync {
    // ========================================================================
    // Metadata
    // ========================================================================

    /// Plugin identifier (e.g., "claude-code")
    fn name(&self) -> &str;

    /// Display name for UI (e.g., "Claude Code")
    fn display_name(&self) -> &str;

    /// Plugin version
    fn version(&self) -> &str;

    /// Plugin description
    fn description(&self) -> &str;

    /// Display icon (emoji like "🟣" or icon name)
    fn icon(&self) -> Option<&str> {
        None
    }

    /// Primary color name for theming (e.g., "purple", "blue", "green")
    fn color(&self) -> Option<&str> {
        None
    }

    // ========================================================================
    // Health & Setup
    // ========================================================================

    /// Check if CLI is installed and accessible
    async fn check_installation(&self) -> Result<bool>;

    /// Get CLI version
    async fn get_cli_version(&self) -> Result<String>;

    /// Validate plugin settings
    async fn validate_settings(&self, settings: &HashMap<String, String>) -> Result<()>;

    // ========================================================================
    // Session Management
    // ========================================================================

    /// Start a new session
    async fn start_session(
        &self,
        project_path: &str,
        settings: &HashMap<String, String>,
    ) -> Result<SessionHandle>;

    /// Resume an existing session by CLI session ID
    async fn resume_session(
        &self,
        cli_session_id: &str,
        project_path: &str,
        settings: &HashMap<String, String>,
    ) -> Result<SessionHandle>;

    /// Stop a running session
    async fn stop_session(&self, handle: &SessionHandle) -> Result<()>;

    /// Get session status
    async fn get_session_status(&self, handle: &SessionHandle) -> Result<SessionStatus>;

    // ========================================================================
    // Message Handling
    // ========================================================================

    /// Send a message to the agent
    async fn send_message(&self, handle: &SessionHandle, message: &str) -> Result<()>;

    /// Read output from the agent (non-blocking)
    async fn read_output(&self, handle: &SessionHandle) -> Result<Vec<OutputChunk>>;

    // ========================================================================
    // History Management (CLI-native)
    // ========================================================================

    /// List all available sessions for a project
    async fn list_sessions(&self, project_path: &str) -> Result<Vec<SessionInfo>>;

    /// Get conversation history from a CLI session
    async fn get_conversation_history(
        &self,
        cli_session_id: &str,
    ) -> Result<Vec<HistoryMessage>>;

    /// Get paginated conversation history (most recent first)
    /// Returns messages in reverse chronological order
    async fn get_conversation_history_paginated(
        &self,
        cli_session_id: &str,
        offset: usize,
        limit: usize,
    ) -> Result<PaginatedHistory>;

    // ========================================================================
    // Real-time Session Monitoring
    // ========================================================================

    /// Start watching a session for real-time updates
    /// The plugin is responsible for implementing its own monitoring strategy:
    /// - File watching for file-based sessions (Claude Code)
    /// - Polling for API-based sessions
    /// - WebSocket connections, etc.
    ///
    /// When new messages are detected, the plugin should emit updates via
    /// the provided callback function.
    ///
    /// Returns a handle that can be used to stop watching
    async fn start_watching_session(
        &self,
        project_path: &str,
        cli_session_id: &str,
        callback: Box<dyn Fn(SessionUpdate) + Send + Sync>,
    ) -> Result<WatchHandle>;

    /// Stop watching a session
    async fn stop_watching_session(&self, handle: WatchHandle) -> Result<()>;

    // ========================================================================
    // Capabilities
    // ========================================================================

    /// Get plugin capabilities
    fn get_capabilities(&self) -> Vec<PluginCapability>;

    /// Get configurable CLI flags that this plugin exposes
    fn get_available_flags(&self) -> Vec<PluginFlag> {
        Vec::new() // Default: no configurable flags
    }
}

// ============================================================================
// Data Structures
// ============================================================================

/// Handle to an active session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionHandle {
    /// Our internal session ID
    pub session_id: String,

    /// CLI's session ID (if it has one)
    pub cli_session_id: Option<String>,

    /// Process ID
    pub process_id: Option<u32>,

    /// Plugin name
    pub plugin_name: String,

    /// Session start time
    pub started_at: i64,
}

/// Session status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionStatus {
    pub is_running: bool,
    pub is_waiting_for_input: bool,
    pub error: Option<String>,
    pub metadata: HashMap<String, String>,
}

/// Information about a CLI session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    /// CLI's session ID
    pub cli_session_id: String,

    /// When the session started
    pub started_at: i64,

    /// Last activity timestamp
    pub last_activity: i64,

    /// Number of messages in the conversation
    pub message_count: usize,

    /// Session status/state
    pub status: String,

    /// Additional metadata
    pub metadata: HashMap<String, String>,
}

/// A message from conversation history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryMessage {
    /// Unique message ID (stable, from CLI or generated)
    pub id: String,

    /// Role: "user" or "assistant"
    pub role: String,

    /// Message content (always a string)
    pub content: String,

    /// Timestamp (Unix timestamp in SECONDS)
    pub timestamp: i64,

    /// Additional metadata (tool use, thinking, etc.)
    pub metadata: HashMap<String, String>,
}

/// An option in a multiple choice question
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionOption {
    /// Display text for this option (1-5 words)
    pub label: String,

    /// Explanation of what this option means
    pub description: String,
}

/// A question from the AskUserQuestion tool
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserQuestion {
    /// The complete question to ask
    pub question: String,

    /// Short header/label for the question (max 12 chars)
    pub header: String,

    /// Whether multiple options can be selected
    #[serde(default)]
    pub multi_select: bool,

    /// Available choices (2-4 options)
    pub options: Vec<QuestionOption>,
}

/// Prompt requiring user input with structured choices
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPrompt {
    /// The questions to ask (1-4)
    pub questions: Vec<UserQuestion>,

    /// Tool use ID for responding
    pub tool_use_id: Option<String>,
}

/// Tool use content block from Claude's API
#[derive(Debug, Clone, Serialize, Deserialize)]
struct ToolUseBlock {
    #[serde(rename = "type")]
    block_type: String,
    id: Option<String>,
    name: String,
    input: serde_json::Value,
}

/// Input structure for AskUserQuestion tool
#[derive(Debug, Clone, Serialize, Deserialize)]
struct AskUserQuestionInput {
    questions: Vec<AskUserQuestionQuestion>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AskUserQuestionQuestion {
    question: String,
    header: String,
    #[serde(rename = "multiSelect", default)]
    multi_select: bool,
    options: Vec<AskUserQuestionOption>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AskUserQuestionOption {
    label: String,
    description: String,
}

impl UserPrompt {
    /// Try to parse a UserPrompt from message content
    /// Returns None if content is not an AskUserQuestion tool use
    pub fn from_content(content: &str) -> Option<Self> {
        // First try parsing as JSON (content could be a JSON array of content blocks)
        if let Ok(blocks) = serde_json::from_str::<Vec<serde_json::Value>>(content) {
            for block in blocks {
                if let Some(prompt) = Self::from_tool_block(&block) {
                    return Some(prompt);
                }
            }
        }

        // Try parsing as single block
        if let Ok(block) = serde_json::from_str::<serde_json::Value>(content) {
            if let Some(prompt) = Self::from_tool_block(&block) {
                return Some(prompt);
            }
        }

        // Try to find AskUserQuestion pattern in text
        if content.contains("AskUserQuestion") {
            // Look for JSON object in the content
            if let Some(start) = content.find('{') {
                if let Some(end) = content.rfind('}') {
                    let json_str = &content[start..=end];
                    if let Ok(block) = serde_json::from_str::<serde_json::Value>(json_str) {
                        if let Some(prompt) = Self::from_tool_block(&block) {
                            return Some(prompt);
                        }
                    }
                }
            }
        }

        None
    }

    /// Check if a message contains an answered tool result for a given tool_use_id
    pub fn is_answered_in(tool_use_id: &str, content: &str) -> bool {
        // Check if content is a tool_result with matching tool_use_id
        if let Ok(block) = serde_json::from_str::<serde_json::Value>(content) {
            if let Some(block_type) = block.get("type").and_then(|v| v.as_str()) {
                if block_type == "tool_result" {
                    if let Some(id) = block.get("tool_use_id").and_then(|v| v.as_str()) {
                        return id == tool_use_id;
                    }
                }
            }
        }

        // Check if content is an array containing a tool_result
        if let Ok(blocks) = serde_json::from_str::<Vec<serde_json::Value>>(content) {
            for block in blocks {
                if let Some(block_type) = block.get("type").and_then(|v| v.as_str()) {
                    if block_type == "tool_result" {
                        if let Some(id) = block.get("tool_use_id").and_then(|v| v.as_str()) {
                            if id == tool_use_id {
                                return true;
                            }
                        }
                    }
                }
            }
        }

        false
    }

    /// Check if the last message in a list contains a pending (unanswered) AskUserQuestion
    /// Returns the pending prompt if found, None otherwise
    pub fn get_pending_from_messages(messages: &[HistoryMessage]) -> Option<Self> {
        if messages.is_empty() {
            return None;
        }

        // Get the last assistant message
        let last_assistant = messages.iter().rev().find(|m| m.role == "assistant")?;

        // Try to parse as AskUserQuestion
        let prompt = Self::from_content(&last_assistant.content)?;

        // If we found a prompt with a tool_use_id, check if it's been answered
        if let Some(ref tool_use_id) = prompt.tool_use_id {
            // Check if any subsequent message contains the answer
            let last_assistant_idx = messages.iter().rposition(|m| m.role == "assistant")?;

            for msg in messages.iter().skip(last_assistant_idx + 1) {
                if Self::is_answered_in(tool_use_id, &msg.content) {
                    return None; // Already answered
                }
            }
        }

        Some(prompt)
    }

    /// Parse from a tool use block
    fn from_tool_block(block: &serde_json::Value) -> Option<Self> {
        // Check if this is a tool_use block
        let block_type = block.get("type")?.as_str()?;
        if block_type != "tool_use" {
            return None;
        }

        // Check if it's AskUserQuestion
        let name = block.get("name")?.as_str()?;
        if name != "AskUserQuestion" {
            return None;
        }

        // Get tool use ID
        let tool_use_id = block.get("id").and_then(|v| v.as_str()).map(String::from);

        // Parse the input
        let input = block.get("input")?;
        let ask_input: AskUserQuestionInput = serde_json::from_value(input.clone()).ok()?;

        // Convert to our public types
        let questions: Vec<UserQuestion> = ask_input
            .questions
            .into_iter()
            .map(|q| UserQuestion {
                question: q.question,
                header: q.header,
                multi_select: q.multi_select,
                options: q
                    .options
                    .into_iter()
                    .map(|o| QuestionOption {
                        label: o.label,
                        description: o.description,
                    })
                    .collect(),
            })
            .collect();

        if questions.is_empty() {
            return None;
        }

        Some(UserPrompt {
            questions,
            tool_use_id,
        })
    }
}

/// Paginated conversation history result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedHistory {
    /// Messages for this page (in reverse chronological order)
    pub messages: Vec<HistoryMessage>,

    /// Total number of messages available
    pub total_count: usize,

    /// Whether there are more messages to load
    pub has_more: bool,

    /// Current offset
    pub offset: usize,
}

/// Handle for a session watch
#[derive(Debug, Clone)]
pub struct WatchHandle {
    pub id: String,
    pub plugin_name: String,
    pub cli_session_id: String,
}

/// Update event from a watched session
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SessionUpdate {
    /// New message added to the session
    NewMessage { message: HistoryMessage },

    /// User input requested with structured choices (AskUserQuestion tool)
    UserPromptRequired { prompt: UserPrompt },

    /// Session status changed
    StatusChanged { status: String },

    /// Session ended
    SessionEnded,

    /// Error occurred while watching
    Error { message: String },
}

/// Output chunk from the agent
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum OutputChunk {
    /// Plain text output
    Text { content: String },

    /// Thinking/reasoning output
    Thinking { content: String },

    /// Tool use
    ToolUse {
        name: String,
        input: String,
    },

    /// Tool result
    ToolResult {
        name: String,
        output: String,
    },

    /// Error message
    Error { message: String },

    /// Status update
    StatusUpdate { message: String },

    /// Session ID announcement (for session resume)
    SessionId { cli_session_id: String },
}

/// Plugin capabilities
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PluginCapability {
    /// Supports session resume
    SessionResume,

    /// Supports streaming output
    StreamingOutput,

    /// Supports tool/function calling
    ToolUse,

    /// Supports multi-turn conversations
    MultiTurn,

    /// Supports file context
    FileContext,

    /// Supports thinking/reasoning display
    Thinking,
}

// ============================================================================
// Plugin Flags (Configurable CLI Options)
// ============================================================================

/// Type of flag input
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum FlagType {
    /// Boolean toggle (presence or absence of flag)
    Toggle,
    /// Selection from predefined options
    Select,
    /// Free-form string value
    String,
}

/// An option for Select-type flags
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlagOption {
    /// The value to pass to the CLI
    pub value: String,
    /// Human-readable label
    pub label: String,
    /// Description of what this option does
    pub description: String,
}

/// Describes a configurable CLI flag that the plugin exposes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginFlag {
    /// Unique identifier for this flag (e.g., "permission_mode")
    pub id: String,
    /// The CLI flag string (e.g., "--permission-mode")
    pub flag: String,
    /// Human-readable label for the UI
    pub label: String,
    /// Description of what this flag does
    pub description: String,
    /// Type of input
    pub flag_type: FlagType,
    /// Default value
    pub default_value: String,
    /// Available options (for Select type)
    pub options: Vec<FlagOption>,
    /// Category for grouping in UI (e.g., "permissions", "output", "model")
    pub category: String,
}

// ============================================================================
// Plugin Manager
// ============================================================================

pub struct PluginManager {
    plugins: HashMap<String, Box<dyn AgentPlugin>>,
    // Keep loaded libraries alive
    #[allow(dead_code)]
    loaded_libraries: Vec<libloading::Library>,
}

impl PluginManager {
    pub fn new() -> Self {
        Self {
            plugins: HashMap::new(),
            loaded_libraries: Vec::new(),
        }
    }

    /// Register a plugin
    pub fn register(&mut self, plugin: Box<dyn AgentPlugin>) {
        let name = plugin.name().to_string();
        log::info!("Registered plugin: {}", name);
        self.plugins.insert(name, plugin);
    }

    /// Load a plugin from a dynamic library
    pub unsafe fn load_from_library(&mut self, library_path: &std::path::Path) -> anyhow::Result<()> {
        log::info!("Loading plugin from library: {:?}", library_path);

        // Load the dynamic library
        let library = libloading::Library::new(library_path)?;

        // Get the plugin constructor function
        type PluginCreate = unsafe extern "C" fn() -> *mut dyn AgentPlugin;
        let constructor: libloading::Symbol<PluginCreate> = library.get(b"create_plugin")?;

        // Call the constructor
        let raw_plugin = constructor();
        if raw_plugin.is_null() {
            anyhow::bail!("Plugin constructor returned null");
        }

        let plugin = Box::from_raw(raw_plugin);
        let name = plugin.name().to_string();

        log::info!("Loaded plugin: {}", name);

        // Register the plugin
        self.plugins.insert(name, plugin);

        // Keep the library loaded
        self.loaded_libraries.push(library);

        Ok(())
    }

    /// Discover and load plugins from a directory
    pub unsafe fn discover_and_load(&mut self, plugin_dir: &std::path::Path) -> anyhow::Result<usize> {
        use crate::plugins::{discover_plugins, GenericCliPlugin};

        let manifests = discover_plugins(plugin_dir)?;
        let mut loaded_count = 0;

        for manifest in manifests {
            // Try to load as dynamic library first
            match self.load_from_library(&manifest.library_path) {
                Ok(_) => {
                    log::info!("Loaded dynamic plugin: {}", manifest.config.plugin.name);
                    loaded_count += 1;
                }
                Err(e) => {
                    // If dynamic loading fails, try config-based GenericCliPlugin
                    log::warn!(
                        "Failed to load dynamic plugin {}: {}. Trying config-based plugin...",
                        manifest.config.plugin.name,
                        e
                    );

                    match GenericCliPlugin::new(manifest.config.clone()) {
                        Ok(generic_plugin) => {
                            let name = generic_plugin.name().to_string();
                            log::info!("Loaded config-based plugin: {}", name);
                            self.plugins.insert(name, Box::new(generic_plugin));
                            loaded_count += 1;
                        }
                        Err(e2) => {
                            log::error!(
                                "Failed to load plugin {} as config-based: {}",
                                manifest.config.plugin.name,
                                e2
                            );
                        }
                    }
                }
            }
        }

        Ok(loaded_count)
    }

    /// Get a plugin by name
    pub fn get(&self, name: &str) -> Option<&dyn AgentPlugin> {
        self.plugins.get(name).map(|p| p.as_ref())
    }

    /// List all registered plugins
    pub fn list_plugins(&self) -> Vec<PluginInfo> {
        self.plugins
            .values()
            .map(|p| PluginInfo {
                name: p.name().to_string(),
                display_name: p.display_name().to_string(),
                version: p.version().to_string(),
                description: p.description().to_string(),
                capabilities: p.get_capabilities(),
                icon: p.icon().map(|s| s.to_string()),
                color: p.color().map(|s| s.to_string()),
                flags: p.get_available_flags(),
            })
            .collect()
    }

    /// Get available flags for a specific plugin
    pub fn get_plugin_flags(&self, plugin_name: &str) -> Option<Vec<PluginFlag>> {
        self.plugins.get(plugin_name).map(|p| p.get_available_flags())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub name: String,
    pub display_name: String,
    pub version: String,
    pub description: String,
    pub capabilities: Vec<PluginCapability>,
    /// Display icon (emoji like "🟣" or icon name)
    pub icon: Option<String>,
    /// Primary color name for theming (e.g., "purple", "blue", "green")
    pub color: Option<String>,
    /// Configurable CLI flags
    pub flags: Vec<PluginFlag>,
}
