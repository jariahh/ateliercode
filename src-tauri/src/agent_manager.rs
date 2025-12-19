use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::RwLock;

use crate::output_parser::{AgentEvent, OutputParser};

/// Represents an active agent session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentSession {
    pub session_id: String,
    pub project_id: String,
    pub agent_type: String,
    pub status: AgentStatus,
    pub pid: Option<u32>,
    pub started_at: i64,
    pub last_activity: i64,
    pub claude_session_id: Option<String>,
}

/// Status of an agent session
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AgentStatus {
    Starting,
    Running,
    Paused,
    Stopped,
    Error,
}

/// Internal structure tracking the session state
struct RunningSession {
    session: AgentSession,
    root_path: String,
    output_buffer: Vec<String>,
    parsed_events: Vec<AgentEvent>,
    parser: OutputParser,
    claude_session_id: Option<String>,
    /// The currently running child process (if any)
    active_child: Option<Arc<RwLock<Option<Child>>>>,
}

/// Manages all agent sessions and their lifecycle
pub struct AgentManager {
    sessions: Arc<RwLock<HashMap<String, RunningSession>>>,
}

impl AgentManager {
    /// Create a new AgentManager instance
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Start a new agent session
    pub async fn start_session(
        &self,
        project_id: String,
        agent_type: String,
        root_path: String,
        resume_session_id: Option<String>,
    ) -> Result<AgentSession> {
        let session_id = uuid::Uuid::new_v4().to_string();

        log::info!(
            "Starting {} agent session {} for project {}",
            agent_type,
            session_id,
            project_id
        );

        // Verify the root path exists
        if !std::path::Path::new(&root_path).exists() {
            anyhow::bail!("Project root path does not exist: {}", root_path);
        }

        // Create session metadata
        let now = chrono::Utc::now().timestamp();
        let session = AgentSession {
            session_id: session_id.clone(),
            project_id,
            agent_type: agent_type.clone(),
            status: AgentStatus::Running,
            pid: None,
            started_at: now,
            last_activity: now,
            claude_session_id: resume_session_id.clone(),
        };

        // Store the running session
        let running_session = RunningSession {
            session: session.clone(),
            root_path: root_path.clone(),
            output_buffer: Vec::new(),
            parsed_events: Vec::new(),
            parser: OutputParser::new(),
            claude_session_id: resume_session_id.clone(),
            active_child: None,
        };

        self.sessions.write().await.insert(session_id.clone(), running_session);

        log::info!("Agent session {} started successfully", session_id);

        // If starting a new session (not resuming), initialize it to get the CLI session ID
        if resume_session_id.is_none() {
            let agent_lower = agent_type.to_lowercase();
            if agent_lower.contains("claude") {
                if let Err(e) = self.initialize_claude_session(&session_id, &root_path).await {
                    log::warn!("Failed to initialize Claude session ID: {}", e);
                    // Don't fail the whole session start, just log the warning
                }
            }
            // Note: Gemini CLI v0.19+ now supports --resume and --list-sessions.
            // We use --resume latest in get_headless_command to automatically continue
            // the most recent session, so explicit initialization is not needed here.
        }

        // Return the updated session (might have claude_session_id now)
        let sessions = self.sessions.read().await;
        if let Some(running_session) = sessions.get(&session_id) {
            Ok(running_session.session.clone())
        } else {
            Ok(session)
        }
    }

    /// Initialize a new Claude session to get its session ID
    async fn initialize_claude_session(&self, session_id: &str, root_path: &str) -> Result<()> {
        log::info!("Initializing Claude session to get session ID...");

        // Run a simple command to initialize the session
        let mut cmd = Command::new("claude");
        cmd.arg("-p")
            .arg("Starting a new session")
            .arg("--output-format")
            .arg("json")
            .arg("--permission-mode")
            .arg("bypassPermissions")
            .current_dir(root_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(target_os = "windows")]
        {
            let mut cmd_wrapper = Command::new("cmd");
            cmd_wrapper.arg("/C")
                .arg("claude")
                .arg("-p")
                .arg("Starting a new session")
                .arg("--output-format")
                .arg("json")
                .arg("--permission-mode")
                .arg("bypassPermissions")
                .current_dir(root_path)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
            cmd = cmd_wrapper;
        }

        let output = cmd.output().await
            .context("Failed to execute Claude initialization command")?;

        if !output.status.success() {
            anyhow::bail!("Claude initialization command failed");
        }

        // Parse JSON output to get session_id
        let output_str = String::from_utf8_lossy(&output.stdout);
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&output_str) {
            if let Some(claude_session_id) = json.get("session_id").and_then(|v| v.as_str()) {
                log::info!("Got Claude session ID: {}", claude_session_id);

                // Update the session with the Claude session ID
                let mut sessions = self.sessions.write().await;
                if let Some(running_session) = sessions.get_mut(session_id) {
                    running_session.claude_session_id = Some(claude_session_id.to_string());
                    running_session.session.claude_session_id = Some(claude_session_id.to_string());
                }

                return Ok(());
            }
        }

        anyhow::bail!("Could not extract session_id from Claude output")
    }

    /// Get the status of an agent session (keeping original position)
    pub async fn get_session_status(&self, session_id: &str) -> Result<AgentSession> {
        let sessions = self.sessions.read().await;
        let running_session = sessions
            .get(session_id)
            .context("Session not found")?;

        Ok(running_session.session.clone())
    }

    /// Send a message to an agent session using headless mode
    /// If a process is already running, it will be killed first (interrupt + resume pattern)
    ///
    /// `flag_settings` can be provided to customize CLI flags (e.g., permission_mode, model)
    pub async fn send_message(
        &self,
        session_id: &str,
        message: String,
        flag_settings: Option<std::collections::HashMap<String, String>>,
    ) -> Result<()> {
        log::info!("Sending message to session {} (length: {} bytes)", session_id, message.len());

        // First, kill any existing process for this session
        self.kill_active_process(session_id).await;

        let sessions = self.sessions.read().await;
        let running_session = sessions
            .get(session_id)
            .context("Session not found")?;

        let agent_type = running_session.session.agent_type.clone();
        let root_path = running_session.root_path.clone();
        let claude_session_id = running_session.claude_session_id.clone();
        drop(sessions); // Release the read lock

        // Get the command based on agent type
        let (program, args, use_stdin) = self.get_headless_command(
            &agent_type,
            &message,
            claude_session_id.as_deref(),
            flag_settings.as_ref(),
        )?;

        log::info!("Executing headless command: {} {:?} in {} (use_stdin: {})", program, args, root_path, use_stdin);

        // Execute the command in headless mode
        // Use Stdio::piped() for stdin if we need to send a large message
        // Otherwise use Stdio::null() to signal no input is coming
        let mut cmd = Command::new(&program);
        cmd.args(&args)
            .current_dir(&root_path)
            .stdin(if use_stdin { Stdio::piped() } else { Stdio::null() })
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(target_os = "windows")]
        {
            // On Windows, we may need to use cmd.exe wrapper for .cmd files
            if program == "claude" || program == "aider" || program == "gemini" {
                let original_args = args.clone();
                cmd = Command::new("cmd");
                cmd.arg("/C")
                    .arg(&program)
                    .args(&original_args)
                    .current_dir(&root_path)
                    .stdin(if use_stdin { Stdio::piped() } else { Stdio::null() })
                    .stdout(Stdio::piped())
                    .stderr(Stdio::piped());
            }
        }

        let mut child = cmd.spawn().context("Failed to spawn headless command")?;

        // If using stdin, write the message and close stdin to signal EOF
        if use_stdin {
            if let Some(mut stdin) = child.stdin.take() {
                use tokio::io::AsyncWriteExt;
                log::info!("Writing {} bytes to stdin", message.len());
                stdin.write_all(message.as_bytes()).await
                    .context("Failed to write message to stdin")?;
                stdin.flush().await
                    .context("Failed to flush stdin")?;
                // stdin is dropped here, which closes the pipe and signals EOF
                log::info!("Message written to stdin, pipe closed");
            }
        }
        let pid = child.id();

        log::info!("Headless command spawned with PID: {:?}", pid);

        // Create a shared reference to the child process for tracking
        let child_holder: Arc<RwLock<Option<Child>>> = Arc::new(RwLock::new(None));
        let child_holder_clone = child_holder.clone();

        // Update PID and store the child process reference
        {
            let mut sessions = self.sessions.write().await;
            if let Some(running_session) = sessions.get_mut(session_id) {
                running_session.session.pid = pid;
                running_session.active_child = Some(child_holder.clone());
            }
        }

        // Spawn background tasks to read both stdout and stderr
        let sessions_clone = self.sessions.clone();
        let sessions_clone_stderr = self.sessions.clone();
        let session_id_clone = session_id.to_string();
        let session_id_clone_stderr = session_id.to_string();

        // Read stdout
        if let Some(stdout) = child.stdout.take() {
            tokio::spawn(async move {
                let reader = BufReader::new(stdout);
                let mut lines = reader.lines();

                while let Ok(Some(line)) = lines.next_line().await {
                    log::info!("STDOUT: {}", line);

                    // Add to output buffer and parse events
                    let mut sessions = sessions_clone.write().await;
                    if let Some(running_session) = sessions.get_mut(&session_id_clone) {
                        // Try to parse Claude's session ID from output
                        if running_session.claude_session_id.is_none() {
                            if let Some(parsed_session_id) = Self::extract_claude_session_id(&line) {
                                log::info!("Detected Claude session ID: {}", parsed_session_id);
                                running_session.claude_session_id = Some(parsed_session_id.clone());
                                running_session.session.claude_session_id = Some(parsed_session_id);
                            }
                        }

                        // Parse the line into events
                        let events = running_session.parser.parse_line(&line);

                        // Store parsed events
                        running_session.parsed_events.extend(events);

                        // Also keep raw output for compatibility
                        running_session.output_buffer.push(line);
                        running_session.session.last_activity = chrono::Utc::now().timestamp();
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
                    log::info!("STDERR: {}", line);

                    // Add to output buffer (prefixed so we know it's stderr) and parse events
                    let mut sessions = sessions_clone_stderr.write().await;
                    if let Some(running_session) = sessions.get_mut(&session_id_clone_stderr) {
                        let stderr_line = format!("[stderr] {}", line);

                        // Parse the line into events (stderr often contains errors)
                        let events = running_session.parser.parse_line(&line);

                        // Store parsed events
                        running_session.parsed_events.extend(events);

                        // Also keep raw output for compatibility
                        running_session.output_buffer.push(stderr_line);
                        running_session.session.last_activity = chrono::Utc::now().timestamp();
                    }
                }
            });
        }

        // Store the child in the holder so it can be killed if needed
        {
            let mut holder = child_holder_clone.write().await;
            *holder = Some(child);
        }

        // Wait for process to complete in another task
        tokio::spawn(async move {
            // Get the child from the holder
            let mut child_opt = child_holder.write().await;
            if let Some(mut child) = child_opt.take() {
                match child.wait().await {
                    Ok(status) => log::info!("Headless command completed with status: {}", status),
                    Err(e) => log::error!("Error waiting for headless command: {}", e),
                }
            }
        });

        Ok(())
    }

    /// Kill the active child process for a session (if any)
    async fn kill_active_process(&self, session_id: &str) {
        let sessions = self.sessions.read().await;
        if let Some(running_session) = sessions.get(session_id) {
            if let Some(child_holder) = &running_session.active_child {
                let mut child_opt = child_holder.write().await;
                if let Some(ref mut child) = *child_opt {
                    log::info!("Killing active process for session {} (PID: {:?})", session_id, child.id());

                    // Try to kill the process
                    if let Err(e) = child.kill().await {
                        log::warn!("Failed to kill process: {}", e);
                    }

                    // Wait for it to actually terminate
                    let _ = child.wait().await;
                    log::info!("Process killed successfully");
                }
                // Clear the child
                *child_opt = None;
            }
        }
    }

    /// Read output from an agent session (non-blocking)
    pub async fn read_output(&self, session_id: &str) -> Result<Vec<String>> {
        let mut sessions = self.sessions.write().await;
        let running_session = sessions
            .get_mut(session_id)
            .context("Session not found")?;

        // Return all buffered output and clear the buffer
        let output = running_session.output_buffer.clone();
        running_session.output_buffer.clear();

        if !output.is_empty() {
            running_session.session.last_activity = chrono::Utc::now().timestamp();
        }

        Ok(output)
    }

    /// Read parsed events from an agent session
    pub async fn read_events(&self, session_id: &str) -> Result<Vec<AgentEvent>> {
        let mut sessions = self.sessions.write().await;
        let running_session = sessions
            .get_mut(session_id)
            .context("Session not found")?;

        // Return all parsed events and clear the buffer
        let events = running_session.parsed_events.clone();
        running_session.parsed_events.clear();

        if !events.is_empty() {
            running_session.session.last_activity = chrono::Utc::now().timestamp();
        }

        Ok(events)
    }

    /// Read both raw output and parsed events
    pub async fn read_output_and_events(&self, session_id: &str) -> Result<(Vec<String>, Vec<AgentEvent>)> {
        let mut sessions = self.sessions.write().await;
        let running_session = sessions
            .get_mut(session_id)
            .context("Session not found")?;

        // Return both buffers and clear them
        let output = running_session.output_buffer.clone();
        let events = running_session.parsed_events.clone();

        running_session.output_buffer.clear();
        running_session.parsed_events.clear();

        if !output.is_empty() || !events.is_empty() {
            running_session.session.last_activity = chrono::Utc::now().timestamp();
        }

        Ok((output, events))
    }

    /// Read output with timeout (for compatibility)
    pub async fn read_output_with_timeout(
        &self,
        session_id: &str,
        _timeout_ms: u64,
    ) -> Result<Vec<String>> {
        // In headless mode, we don't have streaming output, so just return buffered output
        self.read_output(session_id).await
    }

    /// Stop an agent session
    pub async fn stop_session(&self, session_id: &str) -> Result<()> {
        log::info!("Stopping agent session {}", session_id);

        // First, kill any active process
        self.kill_active_process(session_id).await;

        let mut sessions = self.sessions.write().await;

        if let Some(mut running_session) = sessions.remove(session_id) {
            running_session.session.status = AgentStatus::Stopped;
            log::info!("Agent session {} stopped", session_id);
            Ok(())
        } else {
            anyhow::bail!("Session not found: {}", session_id);
        }
    }

    /// List all active sessions
    pub async fn list_sessions(&self) -> Vec<AgentSession> {
        let sessions = self.sessions.read().await;
        sessions
            .values()
            .map(|rs| rs.session.clone())
            .collect()
    }

    /// Check if a session is healthy
    pub async fn health_check(&self, session_id: &str) -> Result<bool> {
        let sessions = self.sessions.read().await;
        Ok(sessions.contains_key(session_id))
    }

    /// Extract Claude's session ID from its output
    fn extract_claude_session_id(line: &str) -> Option<String> {
        // Claude Code typically outputs session info in formats like:
        // "Session ID: abc123"
        // "Resuming session abc123"
        // "Session: abc123"
        // We'll try to match common patterns

        // Try pattern: "Session ID: <id>"
        if let Some(captures) = regex::Regex::new(r"(?i)session\s+id:\s*([a-zA-Z0-9_-]+)")
            .ok()
            .and_then(|re| re.captures(line))
        {
            return captures.get(1).map(|m| m.as_str().to_string());
        }

        // Try pattern: "Session: <id>"
        if let Some(captures) = regex::Regex::new(r"(?i)session:\s*([a-zA-Z0-9_-]+)")
            .ok()
            .and_then(|re| re.captures(line))
        {
            return captures.get(1).map(|m| m.as_str().to_string());
        }

        // Try pattern: "Resuming session <id>"
        if let Some(captures) = regex::Regex::new(r"(?i)resuming\s+session\s+([a-zA-Z0-9_-]+)")
            .ok()
            .and_then(|re| re.captures(line))
        {
            return captures.get(1).map(|m| m.as_str().to_string());
        }

        None
    }

    /// Get the appropriate headless command for an agent type
    /// Get the headless command for an agent type.
    /// Returns (program, args, use_stdin) - if use_stdin is true, message should be piped via stdin
    ///
    /// `flag_settings` is a map of flag_id -> value for user-configured flags
    fn get_headless_command(
        &self,
        agent_type: &str,
        message: &str,
        claude_session_id: Option<&str>,
        flag_settings: Option<&std::collections::HashMap<String, String>>,
    ) -> Result<(String, Vec<String>, bool)> {
        // Use stdin for large messages to avoid command line length limits
        // Windows has ~32KB limit, Linux ~128KB - use 16KB as safe threshold
        let use_stdin = message.len() > 16 * 1024;

        // Helper to get flag value or default
        let get_flag = |flag_id: &str, default: &str| -> String {
            flag_settings
                .and_then(|settings| settings.get(flag_id))
                .filter(|v| !v.is_empty())
                .cloned()
                .unwrap_or_else(|| default.to_string())
        };

        match agent_type.to_lowercase().as_str() {
            "claude" | "claude-code" => {
                // Check if claude CLI is available
                if which::which("claude").is_ok() {
                    let mut args = Vec::new();

                    // Use -r <session-id> if resuming, otherwise use -c
                    if let Some(session_id) = claude_session_id {
                        args.push("-r".to_string());
                        args.push(session_id.to_string());
                    } else {
                        args.push("-c".to_string()); // Continue session (maintains conversation history)
                    }

                    args.push("-p".to_string()); // Print/headless mode

                    if use_stdin {
                        // Use "-" to read prompt from stdin
                        args.push("-".to_string());
                    } else {
                        args.push(message.to_string()); // The message as argument
                    }

                    // Output format (configurable)
                    let output_format = get_flag("output_format", "text");
                    args.push("--output-format".to_string());
                    args.push(output_format);

                    // Permission mode (configurable)
                    let permission_mode = get_flag("permission_mode", "bypassPermissions");
                    args.push("--permission-mode".to_string());
                    args.push(permission_mode);

                    // Model (configurable, only add if not empty/default)
                    let model = get_flag("model", "");
                    if !model.is_empty() {
                        args.push("--model".to_string());
                        args.push(model);
                    }

                    // Max turns (configurable, only add if not 0)
                    let max_turns = get_flag("max_turns", "0");
                    if max_turns != "0" {
                        args.push("--max-turns".to_string());
                        args.push(max_turns);
                    }

                    Ok(("claude".to_string(), args, use_stdin))
                } else {
                    anyhow::bail!("Claude CLI not found. Please ensure 'claude' is installed and in your PATH.");
                }
            }
            "aider" => {
                // Check if aider is available
                if which::which("aider").is_ok() {
                    if use_stdin {
                        // Aider reads from stdin when --message is not provided
                        Ok((
                            "aider".to_string(),
                            vec![
                                "--yes".to_string(),
                            ],
                            true, // Always use stdin for large messages
                        ))
                    } else {
                        Ok((
                            "aider".to_string(),
                            vec![
                                "--yes".to_string(),
                                "--message".to_string(),
                                message.to_string(),
                            ],
                            false,
                        ))
                    }
                } else {
                    anyhow::bail!("Aider CLI not found. Please ensure 'aider' is installed and in your PATH.");
                }
            }
            "gemini" | "gemini-cli" => {
                // Check if gemini CLI is available
                if which::which("gemini").is_ok() {
                    let mut args = Vec::new();

                    // Gemini CLI uses --resume to continue sessions
                    // Pass the session ID directly - Gemini should accept it
                    if let Some(session_id) = claude_session_id {
                        args.push("--resume".to_string());
                        args.push(session_id.to_string());
                        log::info!("Gemini: Using --resume with session ID: {}", session_id);
                    }
                    // If no session_id, start a fresh session (no --resume flag)

                    if use_stdin {
                        // Gemini reads from stdin when prompt is "-"
                        args.push("-".to_string());
                    } else {
                        // Use positional prompt (recommended over deprecated -p flag)
                        args.push(message.to_string());
                    }

                    args.push("-o".to_string());           // Output format flag (short form)
                    args.push("text".to_string());         // Plain text output for parsing
                    args.push("--yolo".to_string());       // Auto-approve all actions

                    log::info!("Gemini command args: {:?}", args);
                    Ok(("gemini".to_string(), args, use_stdin))
                } else {
                    anyhow::bail!("Gemini CLI not found. Please ensure 'gemini' is installed and in your PATH.");
                }
            }
            _ => anyhow::bail!("Unsupported agent type: {}", agent_type),
        }
    }
}

impl Default for AgentManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_status_serialization() {
        let status = AgentStatus::Running;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"running\"");
    }

    #[test]
    fn test_session_creation() {
        let session = AgentSession {
            session_id: "test-123".to_string(),
            project_id: "proj-456".to_string(),
            agent_type: "claude".to_string(),
            status: AgentStatus::Running,
            pid: Some(1234),
            started_at: chrono::Utc::now().timestamp(),
            last_activity: chrono::Utc::now().timestamp(),
            claude_session_id: None,
        };

        assert_eq!(session.agent_type, "claude");
        assert_eq!(session.status, AgentStatus::Running);
    }

    #[test]
    fn test_extract_claude_session_id() {
        // Test various session ID patterns
        assert_eq!(
            AgentManager::extract_claude_session_id("Session ID: abc123"),
            Some("abc123".to_string())
        );
        assert_eq!(
            AgentManager::extract_claude_session_id("Session: xyz789"),
            Some("xyz789".to_string())
        );
        assert_eq!(
            AgentManager::extract_claude_session_id("Resuming session test-session-123"),
            Some("test-session-123".to_string())
        );
        assert_eq!(
            AgentManager::extract_claude_session_id("No session here"),
            None
        );
    }
}
