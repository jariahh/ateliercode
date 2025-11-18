use crate::agent_adapter::{
    AgentAdapter, AgentEvent, FileChange, FileChangeType, ParsedOutput,
};
use async_trait::async_trait;
use regex::Regex;

/// Advanced adapter specifically for Claude Code CLI
/// Implements intelligent parsing of Claude's output format
pub struct ClaudeCodeAdapter {
    session_id: String,
    // Regex patterns compiled once for better performance
    file_created_pattern: Regex,
    file_modified_pattern: Regex,
    file_deleted_pattern: Regex,
    command_pattern: Regex,
    code_block_pattern: Regex,
}

impl ClaudeCodeAdapter {
    pub fn new(session_id: String) -> Self {
        Self {
            session_id,
            file_created_pattern: Regex::new(r"(?i)created?:?\s+(.+?)(?:\s|$)").unwrap(),
            file_modified_pattern: Regex::new(r"(?i)(?:modified?|edit(?:ed|ing)?|writ(?:e|ing)):?\s+(.+?)(?:\s|$)").unwrap(),
            file_deleted_pattern: Regex::new(r"(?i)deleted?:?\s+(.+?)(?:\s|$)").unwrap(),
            command_pattern: Regex::new(r"(?i)(?:ran|executed?|running):?\s+`?([^`\n]+)`?\s*(?:\(exit code:?\s*(\d+)\))?").unwrap(),
            code_block_pattern: Regex::new(r"```(\w+)?\n([\s\S]*?)```").unwrap(),
        }
    }

    /// Detect if Claude is showing a code block
    fn parse_code_block(&self, text: &str) -> Option<(String, String)> {
        self.code_block_pattern.captures(text).and_then(|caps| {
            let language = caps.get(1).map(|m| m.as_str().to_string()).unwrap_or_default();
            let code = caps.get(2).map(|m| m.as_str().to_string())?;
            Some((language, code))
        })
    }

    /// Parse file operation markers from Claude's output
    fn parse_file_operation(&self, line: &str) -> Option<FileChange> {
        // Check for created files
        if let Some(caps) = self.file_created_pattern.captures(line) {
            if let Some(file_path) = caps.get(1) {
                return Some(FileChange {
                    file_path: file_path.as_str().trim().to_string(),
                    change_type: FileChangeType::Created,
                    content: None,
                });
            }
        }

        // Check for modified files
        if let Some(caps) = self.file_modified_pattern.captures(line) {
            if let Some(file_path) = caps.get(1) {
                return Some(FileChange {
                    file_path: file_path.as_str().trim().to_string(),
                    change_type: FileChangeType::Modified,
                    content: None,
                });
            }
        }

        // Check for deleted files
        if let Some(caps) = self.file_deleted_pattern.captures(line) {
            if let Some(file_path) = caps.get(1) {
                return Some(FileChange {
                    file_path: file_path.as_str().trim().to_string(),
                    change_type: FileChangeType::Deleted,
                    content: None,
                });
            }
        }

        None
    }

    /// Parse command execution from Claude's output
    fn parse_command_execution(&self, line: &str) -> Option<(String, Option<i32>)> {
        self.command_pattern.captures(line).and_then(|caps| {
            let command = caps.get(1).map(|m| m.as_str().trim().to_string())?;
            let exit_code = caps
                .get(2)
                .and_then(|m| m.as_str().parse::<i32>().ok());
            Some((command, exit_code))
        })
    }

    /// Detect markdown formatting in Claude's output
    fn has_markdown_formatting(&self, line: &str) -> bool {
        line.starts_with('#')
            || line.starts_with('-')
            || line.starts_with('*')
            || line.starts_with('>')
            || line.contains("**")
            || line.contains("__")
            || self.code_block_pattern.is_match(line)
    }

    /// Check if Claude is explaining something
    fn is_explanation(&self, line: &str) -> bool {
        let lower = line.to_lowercase();
        lower.starts_with("i ")
            || lower.starts_with("let me ")
            || lower.starts_with("here")
            || lower.starts_with("this ")
            || lower.contains("i'll ")
            || lower.contains("i've ")
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

        // Combine multi-line output for better pattern matching
        let combined_output = output.join("\n");

        // Check for code blocks in the combined output
        if let Some((language, code)) = self.parse_code_block(&combined_output) {
            events.push(AgentEvent::MessageReceived {
                session_id: session_id.to_string(),
                content: format!("Code block ({}): {} lines", language, code.lines().count()),
                timestamp: chrono::Utc::now().timestamp(),
            });
        }

        // Process each line
        for line in output {
            let trimmed = line.trim();

            // Skip empty lines
            if trimmed.is_empty() {
                continue;
            }

            // Always emit raw output for debugging
            events.push(AgentEvent::RawOutput {
                session_id: session_id.to_string(),
                line: line.clone(),
            });

            // Parse file operations
            if let Some(file_change) = self.parse_file_operation(trimmed) {
                events.push(AgentEvent::FileChanged {
                    session_id: session_id.to_string(),
                    file_path: file_change.file_path.clone(),
                    change_type: file_change.change_type,
                    content: file_change.content,
                });
            }

            // Parse command execution
            if let Some((command, exit_code)) = self.parse_command_execution(trimmed) {
                events.push(AgentEvent::CommandExecuted {
                    session_id: session_id.to_string(),
                    command,
                    exit_code: exit_code.unwrap_or(0),
                    output: None,
                });
            }

            // Check for errors
            if let Some(error) = self.extract_errors(trimmed) {
                let recoverable = !error.to_lowercase().contains("fatal")
                    && !error.to_lowercase().contains("panic");

                events.push(AgentEvent::Error {
                    session_id: session_id.to_string(),
                    error,
                    recoverable,
                });
            }

            // Check for input prompts
            if self.is_waiting_for_input(trimmed) {
                events.push(AgentEvent::InputRequired {
                    session_id: session_id.to_string(),
                    prompt: trimmed.to_string(),
                });
            }

            // Check for thinking/processing
            if self.is_processing(trimmed) {
                events.push(AgentEvent::Thinking {
                    session_id: session_id.to_string(),
                    message: Some(trimmed.to_string()),
                });
            }

            // Detect explanations or responses from Claude
            if self.is_explanation(trimmed) || self.has_markdown_formatting(trimmed) {
                events.push(AgentEvent::MessageReceived {
                    session_id: session_id.to_string(),
                    content: trimmed.to_string(),
                    timestamp: chrono::Utc::now().timestamp(),
                });
            }
        }

        ParsedOutput { events, raw_text }
    }

    fn format_message(&self, message: &str) -> String {
        // Claude Code accepts plain text messages
        // We can optionally add formatting hints
        message.to_string()
    }

    fn needs_initialization(&self) -> bool {
        // Claude Code might need initial context setting
        false
    }

    fn get_initialization_messages(&self) -> Vec<String> {
        // Could send initial context about the project
        Vec::new()
    }

    fn is_waiting_for_input(&self, output: &str) -> bool {
        let lower = output.to_lowercase();

        // Common prompts from Claude Code
        lower.contains("y/n")
            || lower.contains("(y/n)")
            || lower.contains("yes/no")
            || lower.contains("press enter")
            || lower.contains("continue?")
            || lower.contains("proceed?")
            || lower.contains("confirm?")
            // Questions
            || (output.trim().ends_with('?') && output.len() < 200)
    }

    fn is_processing(&self, output: &str) -> bool {
        let lower = output.to_lowercase();

        lower.contains("thinking")
            || lower.contains("processing")
            || lower.contains("analyzing")
            || lower.contains("working on")
            || lower.contains("loading")
            || lower.contains("searching")
            || lower.contains("reading")
            || lower.contains("examining")
            || lower.contains("considering")
    }

    fn extract_file_changes(&self, output: &str) -> Vec<FileChange> {
        let mut changes = Vec::new();

        if let Some(change) = self.parse_file_operation(output) {
            changes.push(change);
        }

        changes
    }

    fn extract_errors(&self, output: &str) -> Option<String> {
        let lower = output.to_lowercase();

        // Common error patterns
        if lower.contains("error:")
            || lower.contains("error ")
            || lower.contains("failed:")
            || lower.contains("failed ")
            || lower.contains("exception:")
            || lower.contains("panic:")
            || lower.contains("fatal:")
            || lower.contains("could not")
            || lower.contains("cannot")
            || lower.contains("unable to")
        {
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
    fn test_parse_file_created() {
        let adapter = ClaudeCodeAdapter::new("test-session".to_string());
        let line = "Created: src/main.rs";
        let change = adapter.parse_file_operation(line);

        assert!(change.is_some());
        let change = change.unwrap();
        assert_eq!(change.file_path, "src/main.rs");
        assert_eq!(change.change_type, FileChangeType::Created);
    }

    #[test]
    fn test_parse_file_modified() {
        let adapter = ClaudeCodeAdapter::new("test-session".to_string());
        let line = "Modified: Cargo.toml";
        let change = adapter.parse_file_operation(line);

        assert!(change.is_some());
        let change = change.unwrap();
        assert_eq!(change.file_path, "Cargo.toml");
        assert_eq!(change.change_type, FileChangeType::Modified);
    }

    #[test]
    fn test_parse_command_execution() {
        let adapter = ClaudeCodeAdapter::new("test-session".to_string());
        let line = "Ran: cargo build (exit code: 0)";
        let result = adapter.parse_command_execution(line);

        assert!(result.is_some());
        let (cmd, exit_code) = result.unwrap();
        assert_eq!(cmd, "cargo build");
        assert_eq!(exit_code, Some(0));
    }

    #[test]
    fn test_is_waiting_for_input() {
        let adapter = ClaudeCodeAdapter::new("test-session".to_string());

        assert!(adapter.is_waiting_for_input("Do you want to continue? (y/n)"));
        assert!(adapter.is_waiting_for_input("Would you like to proceed?"));
        assert!(adapter.is_waiting_for_input("Press Enter to continue"));
        assert!(!adapter.is_waiting_for_input("Processing your request"));
    }

    #[test]
    fn test_is_processing() {
        let adapter = ClaudeCodeAdapter::new("test-session".to_string());

        assert!(adapter.is_processing("Thinking..."));
        assert!(adapter.is_processing("Analyzing the codebase"));
        assert!(adapter.is_processing("Working on your task"));
        assert!(!adapter.is_processing("Done!"));
    }

    #[test]
    fn test_extract_errors() {
        let adapter = ClaudeCodeAdapter::new("test-session".to_string());

        assert!(adapter.extract_errors("Error: File not found").is_some());
        assert!(adapter.extract_errors("Failed to compile").is_some());
        assert!(adapter.extract_errors("Cannot read file").is_some());
        assert!(adapter.extract_errors("Success!").is_none());
    }

    #[test]
    fn test_code_block_parsing() {
        let adapter = ClaudeCodeAdapter::new("test-session".to_string());
        let text = "```rust\nfn main() {\n    println!(\"Hello\");\n}\n```";
        let result = adapter.parse_code_block(text);

        assert!(result.is_some());
        let (lang, code) = result.unwrap();
        assert_eq!(lang, "rust");
        assert!(code.contains("fn main()"));
    }
}
