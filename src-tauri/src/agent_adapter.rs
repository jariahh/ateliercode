use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

/// Events that can be emitted by agents
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AgentEvent {
    /// Agent sent a message (response)
    MessageReceived {
        session_id: String,
        content: String,
        timestamp: i64,
    },

    /// Agent is thinking/processing
    Thinking {
        session_id: String,
        message: Option<String>,
    },

    /// Agent created or modified a file
    FileChanged {
        session_id: String,
        file_path: String,
        change_type: FileChangeType,
        content: Option<String>,
    },

    /// Agent created a task or subtask
    TaskCreated {
        session_id: String,
        title: String,
        description: Option<String>,
    },

    /// Agent completed a task
    TaskCompleted {
        session_id: String,
        task_id: String,
        result: String,
    },

    /// Agent encountered an error
    Error {
        session_id: String,
        error: String,
        recoverable: bool,
    },

    /// Agent executed a command
    CommandExecuted {
        session_id: String,
        command: String,
        exit_code: i32,
        output: Option<String>,
    },

    /// Agent is requesting user input
    InputRequired {
        session_id: String,
        prompt: String,
    },

    /// Raw output from the agent (for debugging)
    RawOutput {
        session_id: String,
        line: String,
    },

    /// Session status changed
    StatusChanged {
        session_id: String,
        status: String,
    },
}

/// Type of file change
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FileChangeType {
    Created,
    Modified,
    Deleted,
    Renamed,
}

/// Result of parsing agent output
#[derive(Debug, Clone)]
pub struct ParsedOutput {
    pub events: Vec<AgentEvent>,
    pub raw_text: String,
}

/// Trait that all agent adapters must implement
#[async_trait]
pub trait AgentAdapter: Send + Sync {
    /// Get the name of this agent type
    fn agent_type(&self) -> &str;

    /// Parse raw output from the agent into structured events
    fn parse_output(&self, session_id: &str, output: &[String]) -> ParsedOutput;

    /// Format a user message for sending to the agent
    fn format_message(&self, message: &str) -> String;

    /// Check if the agent requires initial setup/prompt
    fn needs_initialization(&self) -> bool {
        false
    }

    /// Get initialization message(s) to send when starting a session
    fn get_initialization_messages(&self) -> Vec<String> {
        Vec::new()
    }

    /// Detect if the agent is waiting for user input
    fn is_waiting_for_input(&self, output: &str) -> bool;

    /// Detect if the agent is currently processing
    fn is_processing(&self, output: &str) -> bool;

    /// Extract file changes from output
    fn extract_file_changes(&self, output: &str) -> Vec<FileChange>;

    /// Extract error messages from output
    fn extract_errors(&self, output: &str) -> Option<String>;
}

/// Represents a file change detected in agent output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChange {
    pub file_path: String,
    pub change_type: FileChangeType,
    pub content: Option<String>,
}

/// Adapter for Claude Code
pub struct ClaudeCodeAdapter {
    pub session_id: String,
}

impl ClaudeCodeAdapter {
    pub fn new(session_id: String) -> Self {
        Self { session_id }
    }
}

#[async_trait]
impl AgentAdapter for ClaudeCodeAdapter {
    fn agent_type(&self) -> &str {
        "claude-code"
    }

    fn parse_output(&self, session_id: &str, output: &[String]) -> ParsedOutput {
        let mut events = Vec::new();
        let raw_text = output.join("\n");

        for line in output {
            // Emit raw output event
            events.push(AgentEvent::RawOutput {
                session_id: session_id.to_string(),
                line: line.clone(),
            });

            // Check for file operations
            if let Some(file_change) = self.parse_file_operation(line) {
                events.push(AgentEvent::FileChanged {
                    session_id: session_id.to_string(),
                    file_path: file_change.file_path,
                    change_type: file_change.change_type,
                    content: file_change.content,
                });
            }

            // Check for errors
            if let Some(error) = self.extract_errors(line) {
                events.push(AgentEvent::Error {
                    session_id: session_id.to_string(),
                    error,
                    recoverable: true,
                });
            }

            // Check for input prompts
            if self.is_waiting_for_input(line) {
                events.push(AgentEvent::InputRequired {
                    session_id: session_id.to_string(),
                    prompt: line.clone(),
                });
            }

            // Check for thinking/processing
            if self.is_processing(line) {
                events.push(AgentEvent::Thinking {
                    session_id: session_id.to_string(),
                    message: Some(line.clone()),
                });
            }

            // Check for command execution
            if let Some((command, exit_code)) = self.parse_command_execution(line) {
                events.push(AgentEvent::CommandExecuted {
                    session_id: session_id.to_string(),
                    command,
                    exit_code,
                    output: None,
                });
            }
        }

        ParsedOutput { events, raw_text }
    }

    fn format_message(&self, message: &str) -> String {
        // Claude Code accepts plain text messages
        message.to_string()
    }

    fn is_waiting_for_input(&self, output: &str) -> bool {
        let lower = output.to_lowercase();
        lower.contains("y/n")
            || lower.contains("(y/n)")
            || lower.contains("yes/no")
            || lower.contains("enter")
            || lower.contains("continue?")
            || output.trim().ends_with('?')
    }

    fn is_processing(&self, output: &str) -> bool {
        let lower = output.to_lowercase();
        lower.contains("thinking")
            || lower.contains("processing")
            || lower.contains("analyzing")
            || lower.contains("working on")
            || lower.contains("loading")
    }

    fn extract_file_changes(&self, output: &str) -> Vec<FileChange> {
        let mut changes = Vec::new();

        // Look for patterns like "Created: file.txt", "Modified: file.txt"
        let patterns = [
            (r"Created:?\s+(.+)", FileChangeType::Created),
            (r"Modified:?\s+(.+)", FileChangeType::Modified),
            (r"Deleted:?\s+(.+)", FileChangeType::Deleted),
            (r"Writing\s+(.+)", FileChangeType::Modified),
            (r"Editing\s+(.+)", FileChangeType::Modified),
        ];

        for (pattern, change_type) in patterns.iter() {
            if let Ok(re) = regex::Regex::new(pattern) {
                if let Some(caps) = re.captures(output) {
                    if let Some(file_path) = caps.get(1) {
                        changes.push(FileChange {
                            file_path: file_path.as_str().trim().to_string(),
                            change_type: change_type.clone(),
                            content: None,
                        });
                    }
                }
            }
        }

        changes
    }

    fn extract_errors(&self, output: &str) -> Option<String> {
        let lower = output.to_lowercase();

        if lower.contains("error:")
            || lower.contains("failed:")
            || lower.contains("exception:")
            || lower.contains("panic:")
        {
            Some(output.to_string())
        } else {
            None
        }
    }
}

impl ClaudeCodeAdapter {
    /// Parse file operations from Claude Code output
    fn parse_file_operation(&self, line: &str) -> Option<FileChange> {
        let changes = self.extract_file_changes(line);
        changes.into_iter().next()
    }

    /// Parse command execution from output
    fn parse_command_execution(&self, line: &str) -> Option<(String, i32)> {
        // Look for patterns like "Ran: npm install (exit code: 0)"
        if let Ok(re) = regex::Regex::new(r"Ran:\s+(.+?)\s+\(exit code:\s+(\d+)\)") {
            if let Some(caps) = re.captures(line) {
                if let (Some(cmd), Some(code)) = (caps.get(1), caps.get(2)) {
                    if let Ok(exit_code) = code.as_str().parse::<i32>() {
                        return Some((cmd.as_str().to_string(), exit_code));
                    }
                }
            }
        }

        None
    }
}

/// Adapter for Aider
pub struct AiderAdapter {
    pub session_id: String,
}

impl AiderAdapter {
    pub fn new(session_id: String) -> Self {
        Self { session_id }
    }
}

#[async_trait]
impl AgentAdapter for AiderAdapter {
    fn agent_type(&self) -> &str {
        "aider"
    }

    fn parse_output(&self, session_id: &str, output: &[String]) -> ParsedOutput {
        let mut events = Vec::new();
        let raw_text = output.join("\n");

        for line in output {
            // Emit raw output event
            events.push(AgentEvent::RawOutput {
                session_id: session_id.to_string(),
                line: line.clone(),
            });

            // Aider-specific parsing would go here
            // For now, we'll use basic parsing similar to Claude
        }

        ParsedOutput { events, raw_text }
    }

    fn format_message(&self, message: &str) -> String {
        // Aider accepts plain text messages
        message.to_string()
    }

    fn is_waiting_for_input(&self, output: &str) -> bool {
        output.contains(">") || output.contains("aider>")
    }

    fn is_processing(&self, output: &str) -> bool {
        let lower = output.to_lowercase();
        lower.contains("thinking")
            || lower.contains("searching")
            || lower.contains("applying")
    }

    fn extract_file_changes(&self, _output: &str) -> Vec<FileChange> {
        // Aider-specific file change detection
        Vec::new()
    }

    fn extract_errors(&self, output: &str) -> Option<String> {
        if output.to_lowercase().contains("error") {
            Some(output.to_string())
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_change_type_serialization() {
        let change_type = FileChangeType::Modified;
        let json = serde_json::to_string(&change_type).unwrap();
        assert_eq!(json, "\"modified\"");
    }

    #[test]
    fn test_claude_adapter_extract_errors() {
        let adapter = ClaudeCodeAdapter::new("test-123".to_string());
        let error_line = "Error: File not found";
        assert!(adapter.extract_errors(error_line).is_some());

        let normal_line = "Successfully created file";
        assert!(adapter.extract_errors(normal_line).is_none());
    }

    #[test]
    fn test_claude_adapter_is_waiting_for_input() {
        let adapter = ClaudeCodeAdapter::new("test-123".to_string());
        assert!(adapter.is_waiting_for_input("Do you want to continue? (y/n)"));
        assert!(adapter.is_waiting_for_input("Would you like to proceed?"));
        assert!(!adapter.is_waiting_for_input("Processing your request"));
    }
}
