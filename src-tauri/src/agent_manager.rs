use anyhow::{Context, Result};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex, RwLock};
use tokio::time::{timeout, Duration};

/// Represents an active agent session with a running process
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentSession {
    pub session_id: String,
    pub project_id: String,
    pub agent_type: String,
    pub status: AgentStatus,
    pub pid: Option<u32>,
    pub started_at: i64,
    pub last_activity: i64,
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

/// Internal structure tracking the actual running process
struct RunningSession {
    session: AgentSession,
    #[allow(dead_code)]
    pty_pair: portable_pty::PtyPair,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    output_rx: mpsc::UnboundedReceiver<String>,
    #[allow(dead_code)]
    child: Box<dyn portable_pty::Child + Send + Sync>,
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
    ) -> Result<AgentSession> {
        let session_id = uuid::Uuid::new_v4().to_string();

        log::info!(
            "Starting {} agent session {} for project {}",
            agent_type,
            session_id,
            project_id
        );

        // Get the command to run based on agent type
        let command = self.get_agent_command(&agent_type)?;

        // Create PTY system
        let pty_system = native_pty_system();

        // Create a new PTY with appropriate size
        let pty_pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .context("Failed to create PTY")?;

        // Spawn the agent process in the PTY
        let mut cmd = CommandBuilder::new(&command.program);
        cmd.args(&command.args);
        cmd.cwd(&root_path);

        // Set up environment variables
        for (key, value) in &command.env {
            cmd.env(key, value);
        }

        let child = pty_pair
            .slave
            .spawn_command(cmd)
            .context("Failed to spawn agent process")?;

        let pid = child.process_id();

        log::info!("Agent process spawned with PID: {:?}", pid);

        // Set up output streaming
        let reader = pty_pair.master.try_clone_reader()?;
        let (output_tx, output_rx) = mpsc::unbounded_channel();

        // Spawn a task to continuously read output
        tokio::task::spawn_blocking(move || {
            let buf_reader = BufReader::new(reader);
            for line in buf_reader.lines() {
                match line {
                    Ok(line) => {
                        if output_tx.send(line).is_err() {
                            // Channel closed, stop reading
                            break;
                        }
                    }
                    Err(e) => {
                        log::error!("Error reading from PTY: {}", e);
                        break;
                    }
                }
            }
        });

        // Get writer for sending input
        let writer = Arc::new(Mutex::new(pty_pair.master.take_writer()?));

        // Create session metadata
        let now = chrono::Utc::now().timestamp();
        let session = AgentSession {
            session_id: session_id.clone(),
            project_id,
            agent_type,
            status: AgentStatus::Running,
            pid,
            started_at: now,
            last_activity: now,
        };

        // Store the running session
        let running_session = RunningSession {
            session: session.clone(),
            pty_pair,
            writer,
            output_rx,
            child,
        };

        self.sessions.write().await.insert(session_id.clone(), running_session);

        log::info!("Agent session {} started successfully", session_id);
        Ok(session)
    }

    /// Send a message/command to an agent session
    pub async fn send_message(&self, session_id: &str, message: String) -> Result<()> {
        log::info!("Sending message to session {}: {}", session_id, message);

        let sessions = self.sessions.read().await;
        let running_session = sessions
            .get(session_id)
            .context("Session not found")?;

        let mut writer = running_session.writer.lock().await;

        // Write the message followed by newline
        writeln!(writer, "{}", message)?;
        writer.flush()?;

        log::info!("Message sent to session {}", session_id);
        Ok(())
    }

    /// Read output from an agent session (non-blocking)
    pub async fn read_output(&self, session_id: &str) -> Result<Vec<String>> {
        let mut sessions = self.sessions.write().await;
        let running_session = sessions
            .get_mut(session_id)
            .context("Session not found")?;

        let mut output = Vec::new();

        // Collect all available output (non-blocking)
        while let Ok(line) = running_session.output_rx.try_recv() {
            output.push(line);
        }

        if !output.is_empty() {
            // Update last activity
            running_session.session.last_activity = chrono::Utc::now().timestamp();
        }

        Ok(output)
    }

    /// Read output from an agent session with timeout
    pub async fn read_output_with_timeout(
        &self,
        session_id: &str,
        timeout_ms: u64,
    ) -> Result<Vec<String>> {
        let mut sessions = self.sessions.write().await;
        let running_session = sessions
            .get_mut(session_id)
            .context("Session not found")?;

        let mut output = Vec::new();

        // Try to read with timeout
        let timeout_result = timeout(
            Duration::from_millis(timeout_ms),
            running_session.output_rx.recv(),
        )
        .await;

        if let Ok(Some(line)) = timeout_result {
            output.push(line);

            // Collect any additional available output
            while let Ok(line) = running_session.output_rx.try_recv() {
                output.push(line);
            }

            // Update last activity
            running_session.session.last_activity = chrono::Utc::now().timestamp();
        }

        Ok(output)
    }

    /// Stop an agent session
    pub async fn stop_session(&self, session_id: &str) -> Result<()> {
        log::info!("Stopping agent session {}", session_id);

        let mut sessions = self.sessions.write().await;

        if let Some(mut running_session) = sessions.remove(session_id) {
            // Try to kill the process gracefully
            if let Err(e) = running_session.child.kill() {
                log::warn!("Failed to kill process for session {}: {}", session_id, e);
            }

            // Update session status
            running_session.session.status = AgentStatus::Stopped;

            log::info!("Agent session {} stopped", session_id);
            Ok(())
        } else {
            anyhow::bail!("Session not found: {}", session_id);
        }
    }

    /// Get the status of an agent session
    pub async fn get_session_status(&self, session_id: &str) -> Result<AgentSession> {
        let sessions = self.sessions.read().await;
        let running_session = sessions
            .get(session_id)
            .context("Session not found")?;

        Ok(running_session.session.clone())
    }

    /// List all active sessions
    pub async fn list_sessions(&self) -> Vec<AgentSession> {
        let sessions = self.sessions.read().await;
        sessions
            .values()
            .map(|rs| rs.session.clone())
            .collect()
    }

    /// Check if a session is healthy and restart if needed
    pub async fn health_check(&self, session_id: &str) -> Result<bool> {
        let sessions = self.sessions.read().await;
        let running_session = sessions
            .get(session_id)
            .context("Session not found")?;

        // Check if the process is still running
        let is_alive = match running_session.child.try_wait() {
            Ok(Some(_exit_status)) => {
                log::warn!("Process for session {} has exited", session_id);
                false
            }
            Ok(None) => true, // Still running
            Err(e) => {
                log::error!("Error checking process status for session {}: {}", session_id, e);
                false
            }
        };

        Ok(is_alive)
    }

    /// Get the appropriate command for an agent type
    fn get_agent_command(&self, agent_type: &str) -> Result<AgentCommand> {
        match agent_type.to_lowercase().as_str() {
            "claude" | "claude-code" => {
                // Check if claude CLI is available
                if which::which("claude").is_ok() {
                    Ok(AgentCommand {
                        program: "claude".to_string(),
                        args: vec!["--no-confirm".to_string()],
                        env: HashMap::new(),
                    })
                } else {
                    anyhow::bail!("Claude Code CLI not found. Please install it first.");
                }
            }
            "aider" => {
                // Check if aider is available
                if which::which("aider").is_ok() {
                    Ok(AgentCommand {
                        program: "aider".to_string(),
                        args: vec!["--yes".to_string()],
                        env: HashMap::new(),
                    })
                } else {
                    anyhow::bail!("Aider CLI not found. Please install it first.");
                }
            }
            _ => anyhow::bail!("Unsupported agent type: {}", agent_type),
        }
    }
}

/// Command configuration for spawning an agent
struct AgentCommand {
    program: String,
    args: Vec<String>,
    env: HashMap<String, String>,
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
        };

        assert_eq!(session.agent_type, "claude");
        assert_eq!(session.status, AgentStatus::Running);
    }
}
