// Generic CLI Plugin Implementation
// Works with any CLI tool via configuration

use crate::output_parser::{AgentEvent, OutputParser};
use crate::plugin::{
    AgentPlugin, HistoryMessage, OutputChunk, PaginatedHistory, PluginCapability, SessionHandle,
    SessionInfo, SessionStatus,
};
use crate::plugins::config::PluginConfig;
use anyhow::{Context, Result};
use async_trait::async_trait;
use regex::Regex;
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::RwLock;

/// Internal session state
struct CliSession {
    session_id: String,
    cli_session_id: Option<String>,
    process_id: Option<u32>,
    project_path: String,
    output_buffer: Vec<String>,
    events_buffer: Vec<AgentEvent>,
    parser: OutputParser,
    started_at: i64,
    last_activity: i64,
    is_running: bool,
    error: Option<String>,
}

/// Generic CLI plugin that works with any CLI tool via config
pub struct GenericCliPlugin {
    config: PluginConfig,
    sessions: Arc<RwLock<HashMap<String, CliSession>>>,
}

impl GenericCliPlugin {
    /// Create a new generic CLI plugin from config
    pub fn new(config: PluginConfig) -> Result<Self> {
        config.validate()?;
        Ok(Self {
            config,
            sessions: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    /// Load plugin from a TOML file
    pub fn from_file(path: &std::path::Path) -> Result<Self> {
        let config = PluginConfig::from_file(path)?;
        Self::new(config)
    }

    /// Extract session ID from output using configured pattern
    fn extract_session_id(&self, line: &str) -> Option<String> {
        if let Some(pattern) = &self.config.output_parsing.session_id_pattern {
            if let Ok(re) = Regex::new(pattern) {
                if let Some(captures) = re.captures(line) {
                    return captures.get(1).map(|m| m.as_str().to_string());
                }
            }
        }
        None
    }

    /// Convert AgentEvent to OutputChunk
    fn event_to_chunk(event: &AgentEvent) -> OutputChunk {
        match event {
            AgentEvent::Thinking { message, .. } => OutputChunk::Thinking {
                content: message.clone().unwrap_or_default(),
            },
            AgentEvent::Error { message, .. } => OutputChunk::Error {
                message: message.clone(),
            },
            AgentEvent::Warning { message, .. } => OutputChunk::StatusUpdate {
                message: format!("Warning: {}", message),
            },
            AgentEvent::CommandExecuted { command, exit_code, .. } => OutputChunk::ToolUse {
                name: "bash".to_string(),
                input: format!("{} (exit code: {})", command, exit_code),
            },
            AgentEvent::FileChanged { path, change_type, .. } => OutputChunk::ToolUse {
                name: "file_operation".to_string(),
                input: format!("{:?}: {}", change_type, path),
            },
            AgentEvent::TestRan { name, passed, details, .. } => OutputChunk::ToolResult {
                name: "test".to_string(),
                output: format!(
                    "Test '{}' {}: {}",
                    name,
                    if *passed { "passed" } else { "failed" },
                    details.as_ref().unwrap_or(&String::new())
                ),
            },
            AgentEvent::TaskCompleted { description, .. } => OutputChunk::StatusUpdate {
                message: format!("Task completed: {}", description),
            },
            AgentEvent::TaskCreated { description, .. } => OutputChunk::StatusUpdate {
                message: format!("Task created: {}", description),
            },
            AgentEvent::MessageReceived { content, .. } => OutputChunk::Text {
                content: content.clone(),
            },
            AgentEvent::InputRequired { prompt, .. } => OutputChunk::StatusUpdate {
                message: format!("Input required: {}", prompt),
            },
            AgentEvent::RawOutput { line, .. } => OutputChunk::Text {
                content: line.clone(),
            },
        }
    }

    /// Execute a command with variable substitution
    async fn execute_command(
        &self,
        template: &[String],
        vars: HashMap<&str, &str>,
        project_path: &str,
    ) -> Result<tokio::process::Child> {
        let args = self.config.replace_variables(template, &vars);

        log::info!("Executing: {} {:?} in {}", self.config.plugin.cli_command, args, project_path);

        let mut cmd = Command::new(&self.config.plugin.cli_command);
        cmd.args(&args)
            .current_dir(project_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(target_os = "windows")]
        {
            // On Windows, wrap with cmd.exe for .cmd files
            let original_args = args.clone();
            cmd = Command::new("cmd");
            cmd.arg("/C")
                .arg(&self.config.plugin.cli_command)
                .args(&original_args)
                .current_dir(project_path)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
        }

        let child = cmd.spawn().context("Failed to spawn CLI command")?;
        Ok(child)
    }
}

#[async_trait]
impl AgentPlugin for GenericCliPlugin {
    // ========================================================================
    // Metadata
    // ========================================================================

    fn name(&self) -> &str {
        &self.config.plugin.name
    }

    fn display_name(&self) -> &str {
        &self.config.plugin.display_name
    }

    fn version(&self) -> &str {
        &self.config.plugin.version
    }

    fn description(&self) -> &str {
        &self.config.plugin.description
    }

    fn icon(&self) -> Option<&str> {
        self.config.plugin.icon.as_deref()
    }

    fn color(&self) -> Option<&str> {
        self.config.plugin.color.as_deref()
    }

    // ========================================================================
    // Health & Setup
    // ========================================================================

    async fn check_installation(&self) -> Result<bool> {
        Ok(which::which(&self.config.plugin.cli_command).is_ok())
    }

    async fn get_cli_version(&self) -> Result<String> {
        if let Some(version_cmd) = &self.config.commands.get_version {
            let output = Command::new(&self.config.plugin.cli_command)
                .args(version_cmd)
                .output()
                .await
                .context("Failed to execute version command")?;

            if !output.status.success() {
                anyhow::bail!("Failed to get CLI version");
            }

            Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            // Try common version flags
            for flag in &["--version", "-v", "-V", "version"] {
                if let Ok(output) = Command::new(&self.config.plugin.cli_command)
                    .arg(flag)
                    .output()
                    .await
                {
                    if output.status.success() {
                        return Ok(String::from_utf8_lossy(&output.stdout).trim().to_string());
                    }
                }
            }
            anyhow::bail!("Could not determine CLI version");
        }
    }

    async fn validate_settings(&self, _settings: &HashMap<String, String>) -> Result<()> {
        // Generic plugins don't require special settings validation
        Ok(())
    }

    // ========================================================================
    // Session Management
    // ========================================================================

    async fn start_session(
        &self,
        project_path: &str,
        _settings: &HashMap<String, String>,
    ) -> Result<SessionHandle> {
        let session_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();

        log::info!("Starting {} session {} for project {}", self.name(), session_id, project_path);

        // Verify project path exists
        if !std::path::Path::new(project_path).exists() {
            anyhow::bail!("Project path does not exist: {}", project_path);
        }

        // Create session state
        let session = CliSession {
            session_id: session_id.clone(),
            cli_session_id: None,
            process_id: None,
            project_path: project_path.to_string(),
            output_buffer: Vec::new(),
            events_buffer: Vec::new(),
            parser: OutputParser::new(),
            started_at: now,
            last_activity: now,
            is_running: true,
            error: None,
        };

        self.sessions.write().await.insert(session_id.clone(), session);

        Ok(SessionHandle {
            session_id: session_id.clone(),
            cli_session_id: None,
            process_id: None,
            plugin_name: self.name().to_string(),
            started_at: now,
        })
    }

    async fn resume_session(
        &self,
        cli_session_id: &str,
        project_path: &str,
        _settings: &HashMap<String, String>,
    ) -> Result<SessionHandle> {
        let session_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();

        log::info!(
            "Resuming {} session {} (CLI session: {})",
            self.name(),
            session_id,
            cli_session_id
        );

        // Check if plugin supports session resume
        if !self.config.capabilities.session_resume {
            anyhow::bail!("Plugin {} does not support session resume", self.name());
        }

        // Verify project path exists
        if !std::path::Path::new(project_path).exists() {
            anyhow::bail!("Project path does not exist: {}", project_path);
        }

        // Create session state with CLI session ID
        let session = CliSession {
            session_id: session_id.clone(),
            cli_session_id: Some(cli_session_id.to_string()),
            process_id: None,
            project_path: project_path.to_string(),
            output_buffer: Vec::new(),
            events_buffer: Vec::new(),
            parser: OutputParser::new(),
            started_at: now,
            last_activity: now,
            is_running: true,
            error: None,
        };

        self.sessions.write().await.insert(session_id.clone(), session);

        Ok(SessionHandle {
            session_id: session_id.clone(),
            cli_session_id: Some(cli_session_id.to_string()),
            process_id: None,
            plugin_name: self.name().to_string(),
            started_at: now,
        })
    }

    async fn stop_session(&self, handle: &SessionHandle) -> Result<()> {
        log::info!("Stopping {} session {}", self.name(), handle.session_id);

        let mut sessions = self.sessions.write().await;
        if let Some(mut session) = sessions.remove(&handle.session_id) {
            session.is_running = false;
            log::info!("Session {} stopped", handle.session_id);
            Ok(())
        } else {
            anyhow::bail!("Session not found: {}", handle.session_id);
        }
    }

    async fn get_session_status(&self, handle: &SessionHandle) -> Result<SessionStatus> {
        let sessions = self.sessions.read().await;
        let session = sessions
            .get(&handle.session_id)
            .context("Session not found")?;

        let mut metadata = HashMap::new();
        if let Some(cli_id) = &session.cli_session_id {
            metadata.insert("cli_session_id".to_string(), cli_id.clone());
        }
        if let Some(pid) = session.process_id {
            metadata.insert("process_id".to_string(), pid.to_string());
        }
        metadata.insert("started_at".to_string(), session.started_at.to_string());
        metadata.insert("last_activity".to_string(), session.last_activity.to_string());

        Ok(SessionStatus {
            is_running: session.is_running,
            is_waiting_for_input: false,
            error: session.error.clone(),
            metadata,
        })
    }

    // ========================================================================
    // Message Handling
    // ========================================================================

    async fn send_message(&self, handle: &SessionHandle, message: &str) -> Result<()> {
        log::info!("Sending message to session {}: {}", handle.session_id, message);

        let (project_path, cli_session_id) = {
            let sessions = self.sessions.read().await;
            let session = sessions
                .get(&handle.session_id)
                .context("Session not found")?;

            (session.project_path.clone(), session.cli_session_id.clone())
        };

        // Build variables map
        let mut vars = HashMap::new();
        vars.insert("message", message);
        vars.insert("project_path", project_path.as_str());

        let cli_session_id_str;
        if let Some(ref cli_id) = cli_session_id {
            cli_session_id_str = cli_id.clone();
            vars.insert("session_id", cli_session_id_str.as_str());
        }

        // Choose the appropriate command
        let command_template = if cli_session_id.is_some() && self.config.commands.resume_session.is_some() {
            self.config.commands.resume_session.as_ref().unwrap()
        } else {
            &self.config.commands.send_message
        };

        // Execute command
        let mut child = self.execute_command(command_template, vars, &project_path).await?;
        let pid = child.id();

        log::info!("CLI command spawned with PID: {:?}", pid);

        // Update PID
        {
            let mut sessions = self.sessions.write().await;
            if let Some(session) = sessions.get_mut(&handle.session_id) {
                session.process_id = pid;
                session.last_activity = chrono::Utc::now().timestamp();
            }
        }

        // Spawn tasks to read stdout and stderr
        let sessions_stdout = self.sessions.clone();
        let sessions_stderr = self.sessions.clone();
        let session_id_stdout = handle.session_id.clone();
        let session_id_stderr = handle.session_id.clone();
        let session_id_pattern = self.config.output_parsing.session_id_pattern.clone();

        // Read stdout
        if let Some(stdout) = child.stdout.take() {
            tokio::spawn(async move {
                let reader = BufReader::new(stdout);
                let mut lines = reader.lines();

                while let Ok(Some(line)) = lines.next_line().await {
                    log::info!("CLI STDOUT: {}", line);

                    let mut sessions = sessions_stdout.write().await;
                    if let Some(session) = sessions.get_mut(&session_id_stdout) {
                        // Try to extract CLI session ID
                        if session.cli_session_id.is_none() && session_id_pattern.is_some() {
                            if let Some(pattern) = &session_id_pattern {
                                if let Ok(re) = Regex::new(pattern) {
                                    if let Some(captures) = re.captures(&line) {
                                        if let Some(cli_id) = captures.get(1) {
                                            log::info!("Detected CLI session ID: {}", cli_id.as_str());
                                            session.cli_session_id = Some(cli_id.as_str().to_string());
                                        }
                                    }
                                }
                            }
                        }

                        // Parse events
                        let events = session.parser.parse_line(&line);
                        session.events_buffer.extend(events);

                        // Store raw output
                        session.output_buffer.push(line);
                        session.last_activity = chrono::Utc::now().timestamp();
                    }
                }
            });
        }

        // Read stderr
        if let Some(stderr) = child.stderr.take() {
            tokio::spawn(async move {
                let reader = BufReader::new(stderr);
                let mut lines = reader.lines();

                while let Ok(Some(line)) = lines.next_line().await {
                    log::info!("CLI STDERR: {}", line);

                    let mut sessions = sessions_stderr.write().await;
                    if let Some(session) = sessions.get_mut(&session_id_stderr) {
                        let stderr_line = format!("[stderr] {}", line);

                        // Parse events
                        let events = session.parser.parse_line(&line);
                        session.events_buffer.extend(events);

                        // Store raw output
                        session.output_buffer.push(stderr_line);
                        session.last_activity = chrono::Utc::now().timestamp();
                    }
                }
            });
        }

        // Wait for process completion
        let sessions_wait = self.sessions.clone();
        let session_id_wait = handle.session_id.clone();
        tokio::spawn(async move {
            match child.wait().await {
                Ok(status) => {
                    log::info!("CLI command completed with status: {}", status);
                    let mut sessions = sessions_wait.write().await;
                    if let Some(session) = sessions.get_mut(&session_id_wait) {
                        session.process_id = None;
                        session.last_activity = chrono::Utc::now().timestamp();
                    }
                }
                Err(e) => {
                    log::error!("Error waiting for CLI command: {}", e);
                    let mut sessions = sessions_wait.write().await;
                    if let Some(session) = sessions.get_mut(&session_id_wait) {
                        session.error = Some(e.to_string());
                        session.is_running = false;
                    }
                }
            }
        });

        Ok(())
    }

    async fn read_output(&self, handle: &SessionHandle) -> Result<Vec<OutputChunk>> {
        let mut sessions = self.sessions.write().await;
        let session = sessions
            .get_mut(&handle.session_id)
            .context("Session not found")?;

        // Convert events to OutputChunks
        let chunks: Vec<OutputChunk> = session
            .events_buffer
            .iter()
            .map(Self::event_to_chunk)
            .collect();

        // Clear buffers
        session.events_buffer.clear();
        session.output_buffer.clear();

        if !chunks.is_empty() {
            session.last_activity = chrono::Utc::now().timestamp();
        }

        Ok(chunks)
    }

    // ========================================================================
    // History Management (CLI-native)
    // ========================================================================

    async fn list_sessions(&self, project_path: &str) -> Result<Vec<SessionInfo>> {
        if let Some(list_cmd) = &self.config.commands.list_sessions {
            log::info!("Listing {} sessions for project: {}", self.name(), project_path);

            let mut vars = HashMap::new();
            vars.insert("project_path", project_path);

            let args = self.config.replace_variables(list_cmd, &vars);

            let output = Command::new(&self.config.plugin.cli_command)
                .args(&args)
                .current_dir(project_path)
                .output()
                .await
                .context("Failed to list sessions")?;

            if !output.status.success() {
                anyhow::bail!("Failed to list sessions");
            }

            // Parse output (assuming JSON for now)
            let output_str = String::from_utf8_lossy(&output.stdout);
            let sessions: Vec<serde_json::Value> = serde_json::from_str(&output_str)
                .unwrap_or_default();

            let mut result = Vec::new();
            for session in sessions {
                if let (Some(id), Some(started_at)) = (
                    session.get("session_id").and_then(|v| v.as_str()),
                    session.get("started_at").and_then(|v| v.as_i64()),
                ) {
                    result.push(SessionInfo {
                        cli_session_id: id.to_string(),
                        started_at,
                        last_activity: session.get("last_activity")
                            .and_then(|v| v.as_i64())
                            .unwrap_or(started_at),
                        message_count: session.get("message_count")
                            .and_then(|v| v.as_u64())
                            .unwrap_or(0) as usize,
                        status: session.get("status")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown")
                            .to_string(),
                        metadata: HashMap::new(),
                    });
                }
            }

            Ok(result)
        } else {
            // Plugin doesn't support listing sessions
            Ok(Vec::new())
        }
    }

    async fn get_conversation_history(
        &self,
        cli_session_id: &str,
    ) -> Result<Vec<HistoryMessage>> {
        if let Some(history_cmd) = &self.config.commands.get_history {
            log::info!("Getting conversation history for session: {}", cli_session_id);

            let mut vars = HashMap::new();
            vars.insert("session_id", cli_session_id);

            let args = self.config.replace_variables(history_cmd, &vars);

            let output = Command::new(&self.config.plugin.cli_command)
                .args(&args)
                .output()
                .await
                .context("Failed to get conversation history")?;

            if !output.status.success() {
                anyhow::bail!("Failed to get conversation history");
            }

            // Parse output (assuming JSON)
            let output_str = String::from_utf8_lossy(&output.stdout);
            let messages: Vec<serde_json::Value> = serde_json::from_str(&output_str)
                .unwrap_or_default();

            let mut result = Vec::new();
            for msg in messages {
                if let (Some(role), Some(content)) = (
                    msg.get("role").and_then(|v| v.as_str()),
                    msg.get("content").and_then(|v| v.as_str()),
                ) {
                    let timestamp = msg.get("timestamp")
                        .and_then(|v| v.as_i64())
                        .unwrap_or(chrono::Utc::now().timestamp());
                    // Generate a stable ID from timestamp and content
                    let id = msg.get("id")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                        .unwrap_or_else(|| format!("msg-{}-{:x}", timestamp, content.len()));
                    result.push(HistoryMessage {
                        id,
                        role: role.to_string(),
                        content: content.to_string(),
                        timestamp,
                        metadata: HashMap::new(),
                    });
                }
            }

            Ok(result)
        } else {
            // Plugin doesn't support history retrieval
            Ok(Vec::new())
        }
    }

    async fn get_conversation_history_paginated(
        &self,
        cli_session_id: &str,
        offset: usize,
        limit: usize,
    ) -> Result<PaginatedHistory> {
        // Load all messages
        let all_messages = self.get_conversation_history(cli_session_id).await?;

        log::info!(
            "[Plugin] Loaded {} total messages from CLI session {}",
            all_messages.len(),
            cli_session_id
        );

        // Find the last continuation/summary message
        // Search for various patterns that indicate a session continuation
        let continuation_index = all_messages.iter().rposition(|msg| {
            let content = &msg.content;
            let is_continuation =
                content.contains("This session is being continued") ||
                content.contains("Conversation Flow Analysis") ||
                content.contains("Summary:") ||
                content.contains("conversation was summarized") ||
                content.contains("summarized below") ||
                content.contains("## Summary") ||
                (content.contains("Analysis:") && content.len() > 500); // Large analysis blocks

            if is_continuation {
                log::debug!(
                    "[Plugin] Found potential continuation message: {}",
                    content.chars().take(100).collect::<String>()
                );
            }

            is_continuation
        });

        // Get messages from continuation point onwards, or last N if no continuation found
        let filtered_messages = if let Some(idx) = continuation_index {
            log::info!(
                "[Plugin] ✓ Found continuation message at index {} (out of {} total), loading {} messages from that point",
                idx,
                all_messages.len(),
                all_messages.len() - idx
            );
            // When continuation is found, ignore the limit and return ALL messages from continuation onwards
            all_messages[idx..].to_vec()
        } else {
            log::info!(
                "[Plugin] No continuation message found in {} total messages, using last {} messages",
                all_messages.len(),
                limit.min(all_messages.len())
            );
            // No continuation found, get last N messages and respect pagination
            let start = all_messages.len().saturating_sub(limit);
            all_messages[start..].to_vec()
        };

        let total_count = filtered_messages.len();

        // Reverse to get most recent first
        let mut reversed_messages = filtered_messages;
        reversed_messages.reverse();

        // Only apply pagination if no continuation was found
        // When continuation is found, return all filtered messages regardless of limit
        let (messages, has_more) = if continuation_index.is_some() {
            // Continuation found: return all messages, ignore pagination
            (reversed_messages, false)
        } else {
            // No continuation: apply pagination normally
            let start = offset.min(total_count);
            let end = (offset + limit).min(total_count);
            let messages = reversed_messages[start..end].to_vec();
            let has_more = end < total_count;
            (messages, has_more)
        };

        log::info!(
            "[Plugin] Returning {} messages (total_count: {}, has_more: {})",
            messages.len(),
            total_count,
            has_more
        );

        Ok(PaginatedHistory {
            messages,
            total_count,
            has_more,
            offset,
        })
    }

    // ========================================================================
    // Capabilities
    // ========================================================================

    fn get_capabilities(&self) -> Vec<PluginCapability> {
        let mut caps = vec![PluginCapability::StreamingOutput, PluginCapability::MultiTurn];

        if self.config.capabilities.session_resume {
            caps.push(PluginCapability::SessionResume);
        }
        if self.config.capabilities.tool_use {
            caps.push(PluginCapability::ToolUse);
        }
        if self.config.capabilities.file_context {
            caps.push(PluginCapability::FileContext);
        }
        if self.config.capabilities.thinking {
            caps.push(PluginCapability::Thinking);
        }

        caps
    }

    // ========================================================================
    // Real-time Session Monitoring
    // ========================================================================

    async fn start_watching_session(
        &self,
        _project_path: &str,
        _cli_session_id: &str,
        _callback: Box<dyn Fn(crate::plugin::SessionUpdate) + Send + Sync>,
    ) -> anyhow::Result<crate::plugin::WatchHandle> {
        // Generic CLI plugins don't support file watching by default
        // Each plugin implementation (like Claude Code) should override this
        anyhow::bail!("Session watching not supported for generic CLI plugins")
    }

    async fn stop_watching_session(&self, _handle: crate::plugin::WatchHandle) -> anyhow::Result<()> {
        // Generic CLI plugins don't support file watching by default
        anyhow::bail!("Session watching not supported for generic CLI plugins")
    }
}
