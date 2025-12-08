use regex::Regex;
use serde::{Deserialize, Serialize};

/// Events that can be parsed from agent output
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AgentEvent {
    /// File was created, modified, or deleted
    FileChanged {
        path: String,
        change_type: FileChangeType,
        timestamp: i64,
    },

    /// Test was executed
    TestRan {
        name: String,
        passed: bool,
        details: Option<String>,
        timestamp: i64,
    },

    /// Task was completed
    TaskCompleted {
        description: String,
        timestamp: i64,
    },

    /// Task was created
    TaskCreated {
        description: String,
        timestamp: i64,
    },

    /// Error occurred
    Error {
        message: String,
        severity: ErrorSeverity,
        timestamp: i64,
    },

    /// Warning was issued
    Warning {
        message: String,
        timestamp: i64,
    },

    /// Command was executed
    CommandExecuted {
        command: String,
        exit_code: i32,
        output: Option<String>,
        timestamp: i64,
    },

    /// Agent is thinking/processing
    Thinking {
        message: Option<String>,
        timestamp: i64,
    },

    /// Agent sent a message
    MessageReceived {
        content: String,
        timestamp: i64,
    },

    /// Input is required from user
    InputRequired {
        prompt: String,
        timestamp: i64,
    },

    /// Raw output line (for debugging)
    RawOutput {
        line: String,
        timestamp: i64,
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

/// Error severity level
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ErrorSeverity {
    Warning,
    Error,
    Fatal,
}

/// Output parser for agent output
pub struct OutputParser {
    /// Regex patterns for file operations
    file_created_regex: Regex,
    file_modified_regex: Regex,
    file_deleted_regex: Regex,
    file_wrote_regex: Regex,
    file_edited_regex: Regex,

    /// Regex patterns for tests
    test_passed_regex: Regex,
    test_failed_regex: Regex,
    test_summary_regex: Regex,

    /// Regex patterns for commands
    command_executed_regex: Regex,
    command_exit_code_regex: Regex,

    /// Regex patterns for errors/warnings
    error_regex: Regex,
    warning_regex: Regex,
    fatal_regex: Regex,

    /// Regex patterns for task completion
    task_complete_regex: Regex,
    task_done_regex: Regex,
    task_created_regex: Regex,
}

impl OutputParser {
    /// Create a new output parser with pre-compiled regex patterns
    pub fn new() -> Self {
        Self {
            // File operation patterns
            file_created_regex: Regex::new(r"(?i)(?:created?|new file):?\s+([^\s\n]+)").unwrap(),
            file_modified_regex: Regex::new(r"(?i)(?:modified?|updated?):?\s+([^\s\n]+)").unwrap(),
            file_deleted_regex: Regex::new(r"(?i)(?:deleted?|removed?):?\s+([^\s\n]+)").unwrap(),
            file_wrote_regex: Regex::new(r"(?i)(?:wrote?|writing):?\s+(?:to\s+)?([^\s\n]+)").unwrap(),
            file_edited_regex: Regex::new(r"(?i)(?:edited?|editing):?\s+([^\s\n]+)").unwrap(),

            // Test patterns
            test_passed_regex: Regex::new(r"(?i)(?:test|spec)\s+(.+?)\s+(?:passed|ok)").unwrap(),
            test_failed_regex: Regex::new(r"(?i)(?:test|spec)\s+(.+?)\s+(?:failed|error)").unwrap(),
            test_summary_regex: Regex::new(r"(?i)(\d+)\s+passed.*?(\d+)\s+failed").unwrap(),

            // Command patterns - using only ASCII characters for quotes
            command_executed_regex: Regex::new(r"(?i)(?:ran?|executed?|running):?\s+[`'\x22]?([^`'\x22]+)[`'\x22]?").unwrap(),
            command_exit_code_regex: Regex::new(r"(?i)exit(?:\s+code)?:?\s*(\d+)").unwrap(),

            // Error/warning patterns
            error_regex: Regex::new(r"(?i)error:?\s+(.+)").unwrap(),
            warning_regex: Regex::new(r"(?i)warning:?\s+(.+)").unwrap(),
            fatal_regex: Regex::new(r"(?i)fatal:?\s+(.+)").unwrap(),

            // Task completion patterns
            task_complete_regex: Regex::new(r"(?i)(?:task|job)\s+(.+?)\s+(?:completed?|done|finished)").unwrap(),
            task_done_regex: Regex::new(r"(?i)(?:completed?|done|finished):?\s+(.+)").unwrap(),
            task_created_regex: Regex::new(r"(?i)(?:task|job)\s+(.+?)\s+(?:created?|added?)").unwrap(),
        }
    }

    /// Parse a batch of output lines into structured events
    pub fn parse_lines(&self, lines: &[String]) -> Vec<AgentEvent> {
        let mut events = Vec::new();
        let now = chrono::Utc::now().timestamp();

        for line in lines {
            let trimmed = line.trim();

            // Skip empty lines
            if trimmed.is_empty() {
                continue;
            }

            // Always emit raw output for debugging
            events.push(AgentEvent::RawOutput {
                line: line.clone(),
                timestamp: now,
            });

            // Parse file changes
            if let Some(event) = self.parse_file_change(trimmed, now) {
                events.push(event);
            }

            // Parse test results
            if let Some(event) = self.parse_test_result(trimmed, now) {
                events.push(event);
            }

            // Parse command execution
            if let Some(event) = self.parse_command_execution(trimmed, now) {
                events.push(event);
            }

            // Parse errors and warnings
            if let Some(event) = self.parse_error_or_warning(trimmed, now) {
                events.push(event);
            }

            // Parse task completion
            if let Some(event) = self.parse_task_completion(trimmed, now) {
                events.push(event);
            }

            // Parse task creation
            if let Some(event) = self.parse_task_created(trimmed, now) {
                events.push(event);
            }

            // Parse thinking/processing indicators
            if self.is_thinking(trimmed) {
                events.push(AgentEvent::Thinking {
                    message: Some(trimmed.to_string()),
                    timestamp: now,
                });
            }

            // Parse input prompts
            if self.is_input_required(trimmed) {
                events.push(AgentEvent::InputRequired {
                    prompt: trimmed.to_string(),
                    timestamp: now,
                });
            }
        }

        events
    }

    /// Parse a single line into events
    pub fn parse_line(&self, line: &str) -> Vec<AgentEvent> {
        self.parse_lines(&[line.to_string()])
    }

    /// Detect file change operations
    fn parse_file_change(&self, line: &str, timestamp: i64) -> Option<AgentEvent> {
        // Check for created files
        if let Some(caps) = self.file_created_regex.captures(line) {
            if let Some(path) = caps.get(1) {
                return Some(AgentEvent::FileChanged {
                    path: path.as_str().trim().to_string(),
                    change_type: FileChangeType::Created,
                    timestamp,
                });
            }
        }

        // Check for modified files
        if let Some(caps) = self.file_modified_regex.captures(line) {
            if let Some(path) = caps.get(1) {
                return Some(AgentEvent::FileChanged {
                    path: path.as_str().trim().to_string(),
                    change_type: FileChangeType::Modified,
                    timestamp,
                });
            }
        }

        // Check for edited files (also modified)
        if let Some(caps) = self.file_edited_regex.captures(line) {
            if let Some(path) = caps.get(1) {
                return Some(AgentEvent::FileChanged {
                    path: path.as_str().trim().to_string(),
                    change_type: FileChangeType::Modified,
                    timestamp,
                });
            }
        }

        // Check for wrote files (also modified)
        if let Some(caps) = self.file_wrote_regex.captures(line) {
            if let Some(path) = caps.get(1) {
                return Some(AgentEvent::FileChanged {
                    path: path.as_str().trim().to_string(),
                    change_type: FileChangeType::Modified,
                    timestamp,
                });
            }
        }

        // Check for deleted files
        if let Some(caps) = self.file_deleted_regex.captures(line) {
            if let Some(path) = caps.get(1) {
                return Some(AgentEvent::FileChanged {
                    path: path.as_str().trim().to_string(),
                    change_type: FileChangeType::Deleted,
                    timestamp,
                });
            }
        }

        None
    }

    /// Detect test results
    fn parse_test_result(&self, line: &str, timestamp: i64) -> Option<AgentEvent> {
        // Check for passed tests
        if let Some(caps) = self.test_passed_regex.captures(line) {
            if let Some(name) = caps.get(1) {
                return Some(AgentEvent::TestRan {
                    name: name.as_str().trim().to_string(),
                    passed: true,
                    details: None,
                    timestamp,
                });
            }
        }

        // Check for failed tests
        if let Some(caps) = self.test_failed_regex.captures(line) {
            if let Some(name) = caps.get(1) {
                return Some(AgentEvent::TestRan {
                    name: name.as_str().trim().to_string(),
                    passed: false,
                    details: Some(line.to_string()),
                    timestamp,
                });
            }
        }

        // Check for test summary (e.g., "5 passed, 2 failed")
        if let Some(caps) = self.test_summary_regex.captures(line) {
            if let (Some(passed_str), Some(failed_str)) = (caps.get(1), caps.get(2)) {
                if let (Ok(passed), Ok(failed)) = (
                    passed_str.as_str().parse::<i32>(),
                    failed_str.as_str().parse::<i32>(),
                ) {
                    return Some(AgentEvent::TestRan {
                        name: "Test Summary".to_string(),
                        passed: failed == 0,
                        details: Some(format!("{} passed, {} failed", passed, failed)),
                        timestamp,
                    });
                }
            }
        }

        None
    }

    /// Detect command execution
    fn parse_command_execution(&self, line: &str, timestamp: i64) -> Option<AgentEvent> {
        if let Some(caps) = self.command_executed_regex.captures(line) {
            if let Some(command) = caps.get(1) {
                let cmd_str = command.as_str().trim().to_string();

                // Try to extract exit code from the same line
                let exit_code = if let Some(exit_caps) = self.command_exit_code_regex.captures(line) {
                    exit_caps
                        .get(1)
                        .and_then(|c| c.as_str().parse::<i32>().ok())
                        .unwrap_or(0)
                } else {
                    0
                };

                return Some(AgentEvent::CommandExecuted {
                    command: cmd_str,
                    exit_code,
                    output: None,
                    timestamp,
                });
            }
        }

        None
    }

    /// Detect errors and warnings
    fn parse_error_or_warning(&self, line: &str, timestamp: i64) -> Option<AgentEvent> {
        // Check for fatal errors first
        if let Some(caps) = self.fatal_regex.captures(line) {
            if let Some(msg) = caps.get(1) {
                return Some(AgentEvent::Error {
                    message: msg.as_str().trim().to_string(),
                    severity: ErrorSeverity::Fatal,
                    timestamp,
                });
            }
        }

        // Check for errors
        if let Some(caps) = self.error_regex.captures(line) {
            if let Some(msg) = caps.get(1) {
                return Some(AgentEvent::Error {
                    message: msg.as_str().trim().to_string(),
                    severity: ErrorSeverity::Error,
                    timestamp,
                });
            }
        }

        // Check for warnings
        if let Some(caps) = self.warning_regex.captures(line) {
            if let Some(msg) = caps.get(1) {
                return Some(AgentEvent::Warning {
                    message: msg.as_str().trim().to_string(),
                    timestamp,
                });
            }
        }

        // Fallback: check for generic error patterns
        let lower = line.to_lowercase();
        if lower.contains("failed") || lower.contains("cannot") || lower.contains("unable to") {
            return Some(AgentEvent::Error {
                message: line.to_string(),
                severity: ErrorSeverity::Error,
                timestamp,
            });
        }

        None
    }

    /// Detect task completion
    fn parse_task_completion(&self, line: &str, timestamp: i64) -> Option<AgentEvent> {
        // Check for "task X completed" pattern
        if let Some(caps) = self.task_complete_regex.captures(line) {
            if let Some(desc) = caps.get(1) {
                return Some(AgentEvent::TaskCompleted {
                    description: desc.as_str().trim().to_string(),
                    timestamp,
                });
            }
        }

        // Check for "completed: X" pattern
        if let Some(caps) = self.task_done_regex.captures(line) {
            if let Some(desc) = caps.get(1) {
                return Some(AgentEvent::TaskCompleted {
                    description: desc.as_str().trim().to_string(),
                    timestamp,
                });
            }
        }

        None
    }

    /// Detect task creation
    fn parse_task_created(&self, line: &str, timestamp: i64) -> Option<AgentEvent> {
        if let Some(caps) = self.task_created_regex.captures(line) {
            if let Some(desc) = caps.get(1) {
                return Some(AgentEvent::TaskCreated {
                    description: desc.as_str().trim().to_string(),
                    timestamp,
                });
            }
        }

        None
    }

    /// Check if agent is thinking/processing
    fn is_thinking(&self, line: &str) -> bool {
        let lower = line.to_lowercase();
        lower.contains("thinking")
            || lower.contains("processing")
            || lower.contains("analyzing")
            || lower.contains("working on")
            || lower.contains("examining")
            || lower.contains("considering")
            || lower.contains("loading")
    }

    /// Check if input is required
    fn is_input_required(&self, line: &str) -> bool {
        let lower = line.to_lowercase();
        (lower.contains("y/n")
            || lower.contains("(y/n)")
            || lower.contains("yes/no")
            || lower.contains("press enter")
            || lower.contains("continue?")
            || lower.contains("proceed?"))
            || (line.trim().ends_with('?') && line.len() < 200)
    }
}

impl Default for OutputParser {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_file_created() {
        let parser = OutputParser::new();
        let line = "Created: src/main.rs";
        let events = parser.parse_line(line);

        let file_changes: Vec<_> = events
            .iter()
            .filter_map(|e| match e {
                AgentEvent::FileChanged { path, change_type, .. } => {
                    Some((path.clone(), change_type.clone()))
                }
                _ => None,
            })
            .collect();

        assert_eq!(file_changes.len(), 1);
        assert_eq!(file_changes[0].0, "src/main.rs");
        assert_eq!(file_changes[0].1, FileChangeType::Created);
    }

    #[test]
    fn test_parse_file_modified() {
        let parser = OutputParser::new();
        let line = "Modified: Cargo.toml";
        let events = parser.parse_line(line);

        let file_changes: Vec<_> = events
            .iter()
            .filter_map(|e| match e {
                AgentEvent::FileChanged { path, change_type, .. } => {
                    Some((path.clone(), change_type.clone()))
                }
                _ => None,
            })
            .collect();

        assert_eq!(file_changes.len(), 1);
        assert_eq!(file_changes[0].0, "Cargo.toml");
        assert_eq!(file_changes[0].1, FileChangeType::Modified);
    }

    #[test]
    fn test_parse_file_deleted() {
        let parser = OutputParser::new();
        let line = "Deleted: old_file.txt";
        let events = parser.parse_line(line);

        let file_changes: Vec<_> = events
            .iter()
            .filter_map(|e| match e {
                AgentEvent::FileChanged { path, change_type, .. } => {
                    Some((path.clone(), change_type.clone()))
                }
                _ => None,
            })
            .collect();

        assert_eq!(file_changes.len(), 1);
        assert_eq!(file_changes[0].0, "old_file.txt");
        assert_eq!(file_changes[0].1, FileChangeType::Deleted);
    }

    #[test]
    fn test_parse_test_passed() {
        let parser = OutputParser::new();
        let line = "test unit_test_example ... passed";
        let events = parser.parse_line(line);

        let tests: Vec<_> = events
            .iter()
            .filter_map(|e| match e {
                AgentEvent::TestRan { name, passed, .. } => Some((name.clone(), *passed)),
                _ => None,
            })
            .collect();

        assert_eq!(tests.len(), 1);
        assert!(tests[0].1);
    }

    #[test]
    fn test_parse_test_failed() {
        let parser = OutputParser::new();
        let line = "test integration_test ... FAILED";
        let events = parser.parse_line(line);

        let tests: Vec<_> = events
            .iter()
            .filter_map(|e| match e {
                AgentEvent::TestRan { name, passed, .. } => Some((name.clone(), *passed)),
                _ => None,
            })
            .collect();

        assert_eq!(tests.len(), 1);
        assert!(!tests[0].1);
    }

    #[test]
    fn test_parse_command_executed() {
        let parser = OutputParser::new();
        let line = "Ran: cargo build";
        let events = parser.parse_line(line);

        let commands: Vec<_> = events
            .iter()
            .filter_map(|e| match e {
                AgentEvent::CommandExecuted { command, exit_code, .. } => {
                    Some((command.clone(), *exit_code))
                }
                _ => None,
            })
            .collect();

        assert_eq!(commands.len(), 1);
        assert_eq!(commands[0].0, "cargo build");
    }

    #[test]
    fn test_parse_error() {
        let parser = OutputParser::new();
        let line = "Error: File not found";
        let events = parser.parse_line(line);

        let errors: Vec<_> = events
            .iter()
            .filter_map(|e| match e {
                AgentEvent::Error { message, severity, .. } => {
                    Some((message.clone(), severity.clone()))
                }
                _ => None,
            })
            .collect();

        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0].0, "File not found");
        assert_eq!(errors[0].1, ErrorSeverity::Error);
    }

    #[test]
    fn test_parse_warning() {
        let parser = OutputParser::new();
        let line = "Warning: Deprecated function used";
        let events = parser.parse_line(line);

        let warnings: Vec<_> = events
            .iter()
            .filter_map(|e| match e {
                AgentEvent::Warning { message, .. } => Some(message.clone()),
                _ => None,
            })
            .collect();

        assert_eq!(warnings.len(), 1);
        assert_eq!(warnings[0], "Deprecated function used");
    }

    #[test]
    fn test_parse_task_completed() {
        let parser = OutputParser::new();
        let line = "Task implementing login completed";
        let events = parser.parse_line(line);

        let tasks: Vec<_> = events
            .iter()
            .filter_map(|e| match e {
                AgentEvent::TaskCompleted { description, .. } => Some(description.clone()),
                _ => None,
            })
            .collect();

        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0], "implementing login");
    }

    #[test]
    fn test_parse_task_created() {
        let parser = OutputParser::new();
        let line = "Task setup database created";
        let events = parser.parse_line(line);

        let tasks: Vec<_> = events
            .iter()
            .filter_map(|e| match e {
                AgentEvent::TaskCreated { description, .. } => Some(description.clone()),
                _ => None,
            })
            .collect();

        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0], "setup database");
    }

    #[test]
    fn test_is_thinking() {
        let parser = OutputParser::new();
        assert!(parser.is_thinking("Thinking about the solution..."));
        assert!(parser.is_thinking("Processing your request"));
        assert!(parser.is_thinking("Analyzing the codebase"));
        assert!(!parser.is_thinking("Done!"));
    }

    #[test]
    fn test_is_input_required() {
        let parser = OutputParser::new();
        assert!(parser.is_input_required("Do you want to continue? (y/n)"));
        assert!(parser.is_input_required("Would you like to proceed?"));
        assert!(parser.is_input_required("Press Enter to continue"));
        assert!(!parser.is_input_required("Processing your request"));
    }

    #[test]
    fn test_parse_fatal_error() {
        let parser = OutputParser::new();
        let line = "Fatal: System crash detected";
        let events = parser.parse_line(line);

        let errors: Vec<_> = events
            .iter()
            .filter_map(|e| match e {
                AgentEvent::Error { message, severity, .. } => {
                    Some((message.clone(), severity.clone()))
                }
                _ => None,
            })
            .collect();

        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0].0, "System crash detected");
        assert_eq!(errors[0].1, ErrorSeverity::Fatal);
    }

    #[test]
    fn test_raw_output_always_emitted() {
        let parser = OutputParser::new();
        let line = "Some random output";
        let events = parser.parse_line(line);

        let raw_outputs: Vec<_> = events
            .iter()
            .filter_map(|e| match e {
                AgentEvent::RawOutput { line, .. } => Some(line.clone()),
                _ => None,
            })
            .collect();

        assert_eq!(raw_outputs.len(), 1);
        assert_eq!(raw_outputs[0], "Some random output");
    }
}
