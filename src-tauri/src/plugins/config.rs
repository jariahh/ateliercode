// Plugin Configuration Schema
// This defines the TOML format for external plugins

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Plugin configuration loaded from plugin.toml
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginConfig {
    pub plugin: PluginMetadata,
    pub capabilities: PluginCapabilities,
    pub commands: PluginCommands,
    #[serde(default)]
    pub output_parsing: OutputParsing,
}

/// Plugin metadata section
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginMetadata {
    pub name: String,
    pub display_name: String,
    pub version: String,
    pub description: String,
    pub author: Option<String>,
    pub homepage: Option<String>,
    pub cli_command: String,
    /// Display icon (emoji like "🟣" or icon name)
    #[serde(default)]
    pub icon: Option<String>,
    /// Primary color name for theming (e.g., "purple", "blue", "green")
    #[serde(default)]
    pub color: Option<String>,
}

/// Plugin capabilities section
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginCapabilities {
    #[serde(default)]
    pub session_resume: bool,
    #[serde(default = "default_true")]
    pub streaming_output: bool,
    #[serde(default)]
    pub tool_use: bool,
    #[serde(default = "default_true")]
    pub multi_turn: bool,
    #[serde(default)]
    pub file_context: bool,
    #[serde(default)]
    pub thinking: bool,
}

fn default_true() -> bool {
    true
}

/// Plugin commands section
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginCommands {
    /// Command to start a new session
    /// Variables: {project_path}
    pub start_session: Vec<String>,

    /// Command to send a message
    /// Variables: {message}, {session_id}
    pub send_message: Vec<String>,

    /// Command to resume an existing session (optional)
    /// Variables: {session_id}, {project_path}
    pub resume_session: Option<Vec<String>>,

    /// Command to list available sessions (optional)
    /// Variables: {project_path}
    pub list_sessions: Option<Vec<String>>,

    /// Command to get conversation history (optional)
    /// Variables: {session_id}
    pub get_history: Option<Vec<String>>,

    /// Command to check CLI version (optional)
    pub get_version: Option<Vec<String>>,
}

/// Output parsing configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OutputParsing {
    /// Regex pattern to extract session ID from output
    /// Capture group 1 should contain the session ID
    pub session_id_pattern: Option<String>,

    /// Output format: "text" or "json"
    #[serde(default = "default_text")]
    pub output_format: String,

    /// JSON path to session ID (if output_format is "json")
    pub session_id_json_path: Option<String>,

    /// Custom patterns for parsing events
    #[serde(default)]
    pub event_patterns: HashMap<String, String>,
}

fn default_text() -> String {
    "text".to_string()
}

impl PluginConfig {
    /// Load plugin config from a TOML file
    pub fn from_file(path: &std::path::Path) -> anyhow::Result<Self> {
        let contents = std::fs::read_to_string(path)?;
        let config: PluginConfig = toml::from_str(&contents)?;
        Ok(config)
    }

    /// Validate the plugin config
    pub fn validate(&self) -> anyhow::Result<()> {
        // Check that CLI command is not empty
        if self.plugin.cli_command.is_empty() {
            anyhow::bail!("Plugin CLI command cannot be empty");
        }

        // Check that required commands are present
        if self.commands.start_session.is_empty() {
            anyhow::bail!("Plugin must define start_session command");
        }

        if self.commands.send_message.is_empty() {
            anyhow::bail!("Plugin must define send_message command");
        }

        Ok(())
    }

    /// Replace variables in a command template
    pub fn replace_variables(&self, template: &[String], vars: &HashMap<&str, &str>) -> Vec<String> {
        template
            .iter()
            .map(|arg| {
                let mut result = arg.clone();
                for (key, value) in vars {
                    result = result.replace(&format!("{{{}}}", key), value);
                }
                result
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_plugin_config() {
        let toml = r#"
[plugin]
name = "claude-code"
display_name = "Claude Code"
version = "1.0.0"
description = "Official Claude Code CLI"
cli_command = "claude"

[capabilities]
session_resume = true
streaming_output = true
tool_use = true
multi_turn = true
file_context = true
thinking = true

[commands]
start_session = ["claude", "-c", "-p", "Starting session"]
send_message = ["claude", "-p", "{message}"]
resume_session = ["claude", "-r", "{session_id}", "-p", "{message}"]
list_sessions = ["claude", "--list-sessions"]
get_history = ["claude", "-r", "{session_id}", "--show-history"]

[output_parsing]
session_id_pattern = "Session ID: ([a-zA-Z0-9_-]+)"
output_format = "text"
"#;

        let config: PluginConfig = toml::from_str(toml).unwrap();
        assert_eq!(config.plugin.name, "claude-code");
        assert_eq!(config.plugin.cli_command, "claude");
        assert!(config.capabilities.session_resume);
        assert_eq!(config.commands.start_session[0], "claude");
    }

    #[test]
    fn test_replace_variables() {
        let config = PluginConfig {
            plugin: PluginMetadata {
                name: "test".to_string(),
                display_name: "Test".to_string(),
                version: "1.0.0".to_string(),
                description: "Test plugin".to_string(),
                author: None,
                homepage: None,
                cli_command: "test".to_string(),
                icon: None,
                color: None,
            },
            capabilities: PluginCapabilities {
                session_resume: false,
                streaming_output: true,
                tool_use: false,
                multi_turn: true,
                file_context: false,
                thinking: false,
            },
            commands: PluginCommands {
                start_session: vec!["test".to_string(), "--project".to_string(), "{project_path}".to_string()],
                send_message: vec!["test".to_string(), "-m".to_string(), "{message}".to_string()],
                resume_session: None,
                list_sessions: None,
                get_history: None,
                get_version: None,
            },
            output_parsing: OutputParsing::default(),
        };

        let mut vars = HashMap::new();
        vars.insert("project_path", "/path/to/project");

        let result = config.replace_variables(&config.commands.start_session, &vars);
        assert_eq!(result[2], "/path/to/project");
    }
}
