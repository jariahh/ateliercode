// AI Service - Plugin-based architecture for multiple AI providers
// Based on production implementation from marion-mri project
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::env;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use which::which;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AIProvider {
    Claude,
    OpenAI,
    Gemini,
}

impl AIProvider {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "claude" => Some(Self::Claude),
            "openai" | "gpt" => Some(Self::OpenAI),
            "gemini" | "google" => Some(Self::Gemini),
            _ => None,
        }
    }
}

/// Trait that all AI provider plugins must implement
#[async_trait]
pub trait AIPlugin: Send + Sync {
    /// Check if the AI provider CLI is available on the system
    fn is_available(&self) -> bool;

    /// Send a chat completion request
    async fn chat_completion(&self, messages: Vec<ChatMessage>) -> Result<String, String>;

    /// Get the provider name
    fn name(&self) -> &str;
}

/// Main AI service that manages AI providers
pub struct AIService {
    provider: Box<dyn AIPlugin>,
}

impl AIService {
    /// Create a new AI service with the specified provider
    pub fn new(provider_type: AIProvider) -> Self {
        let provider: Box<dyn AIPlugin> = match provider_type {
            AIProvider::Claude => Box::new(ClaudePlugin),
            AIProvider::OpenAI => Box::new(OpenAIPlugin),
            AIProvider::Gemini => Box::new(GeminiPlugin),
        };

        Self { provider }
    }

    /// Create from environment variable (defaults to Claude)
    pub fn from_env() -> Self {
        let provider_str = env::var("AI_PROVIDER").unwrap_or_else(|_| "claude".to_string());
        let provider_type = AIProvider::from_str(&provider_str).unwrap_or(AIProvider::Claude);
        Self::new(provider_type)
    }

    /// Check if the current provider is available
    pub fn is_available(&self) -> bool {
        self.provider.is_available()
    }

    /// Send a chat completion request
    pub async fn chat_completion(&self, messages: Vec<ChatMessage>) -> Result<String, String> {
        self.provider.chat_completion(messages).await
    }

    /// Get the current provider name
    pub fn provider_name(&self) -> &str {
        self.provider.name()
    }
}

// ============================================================================
// Claude Plugin - Production-tested implementation
// ============================================================================

struct ClaudePlugin;

impl ClaudePlugin {
    /// Find Claude CLI command - Windows requires .cmd extension
    fn find_claude_cli() -> Result<String, String> {
        // Check if we're on Windows
        if cfg!(target_os = "windows") {
            // Windows MUST use .cmd extension
            let paths_to_check = vec![
                "claude.cmd".to_string(),
                "C:\\Program Files\\nodejs\\claude.cmd".to_string(),
                "C:\\Program Files (x86)\\nodejs\\claude.cmd".to_string(),
                format!(
                    "{}\\AppData\\Roaming\\npm\\claude.cmd",
                    env::var("USERPROFILE").unwrap_or_default()
                ),
            ];

            // First check PATH using which
            if let Ok(path) = which("claude.cmd") {
                log::info!("Found Claude CLI at: {:?}", path);
                return Ok(path.to_string_lossy().to_string());
            }

            // Then check common locations
            for path in paths_to_check {
                if PathBuf::from(&path).exists() {
                    log::info!("Found Claude CLI at: {}", path);
                    return Ok(path);
                }
            }

            Err("Claude CLI not found. Install via: npm install -g @anthropic-ai/claude-code".to_string())
        } else {
            // Unix-like systems
            if let Ok(path) = which("claude") {
                log::info!("Found Claude CLI at: {:?}", path);
                return Ok(path.to_string_lossy().to_string());
            }

            Err("Claude CLI not found. Install via: npm install -g @anthropic-ai/claude-code".to_string())
        }
    }

}

#[async_trait]
impl AIPlugin for ClaudePlugin {
    fn is_available(&self) -> bool {
        Self::find_claude_cli().is_ok()
    }

    fn name(&self) -> &str {
        "Claude"
    }

    async fn chat_completion(&self, messages: Vec<ChatMessage>) -> Result<String, String> {
        let claude_cmd = Self::find_claude_cli()?;

        // Get the last user message to send to Claude
        let user_message = messages
            .iter()
            .filter(|m| m.role == "user")
            .last()
            .map(|m| m.content.as_str())
            .unwrap_or("");

        if user_message.is_empty() {
            return Err("No user message found".to_string());
        }

        log::info!("Calling Claude CLI with message length: {}", user_message.len());

        // Build command with critical flags
        let mut cmd = Command::new(&claude_cmd);
        cmd.arg("--print")  // Non-interactive mode
            .arg("--dangerously-skip-permissions")  // Skip permission prompts
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        // Spawn the process
        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn claude command: {}", e))?;

        // CRITICAL: Write prompt via stdin (not command-line args)
        // This is required for long prompts
        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(user_message.as_bytes())
                .await
                .map_err(|e| format!("Failed to write to claude stdin: {}", e))?;
            stdin
                .flush()
                .await
                .map_err(|e| format!("Failed to flush stdin: {}", e))?;
            // Close stdin to signal end of input
            drop(stdin);
        }

        // Read the output
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Failed to capture stdout".to_string())?;

        let mut reader = BufReader::new(stdout).lines();
        let mut response = String::new();

        while let Some(line) = reader
            .next_line()
            .await
            .map_err(|e| format!("Failed to read from claude stdout: {}", e))?
        {
            if !response.is_empty() {
                response.push('\n');
            }
            response.push_str(&line);
        }

        // Wait for the process to complete with timeout
        let status = tokio::time::timeout(
            tokio::time::Duration::from_secs(300), // 5 minute timeout
            child.wait()
        )
        .await
        .map_err(|_| "Claude CLI timeout after 5 minutes".to_string())?
        .map_err(|e| format!("Failed to wait for claude process: {}", e))?;

        if !status.success() {
            // Try to read stderr for error message
            let stderr = if let Some(mut stderr_handle) = child.stderr {
                let mut stderr_buf = String::new();
                let mut stderr_reader = BufReader::new(&mut stderr_handle);
                let _ = stderr_reader.read_to_string(&mut stderr_buf).await;
                stderr_buf
            } else {
                String::new()
            };

            return Err(format!(
                "Claude CLI exited with error (code: {:?}): {}",
                status.code(),
                stderr
            ));
        }

        if response.is_empty() {
            return Err("Claude CLI returned empty response".to_string());
        }

        log::info!("Received response from Claude CLI ({} bytes)", response.len());

        Ok(response)
    }

}

// ============================================================================
// OpenAI Plugin - To be implemented
// ============================================================================

struct OpenAIPlugin;

impl OpenAIPlugin {
    fn find_openai_cli() -> Result<String, String> {
        // Check for gpt CLI tool
        if let Ok(path) = which("gpt") {
            return Ok(path.to_string_lossy().to_string());
        }
        Err("OpenAI CLI not found. This plugin is not yet implemented.".to_string())
    }
}

#[async_trait]
impl AIPlugin for OpenAIPlugin {
    fn is_available(&self) -> bool {
        Self::find_openai_cli().is_ok()
    }

    fn name(&self) -> &str {
        "OpenAI"
    }

    async fn chat_completion(&self, _messages: Vec<ChatMessage>) -> Result<String, String> {
        Err("OpenAI plugin not yet implemented. Please contribute at github.com/jariahh/ateliercode".to_string())
    }
}

// ============================================================================
// Gemini Plugin - To be implemented
// ============================================================================

struct GeminiPlugin;

impl GeminiPlugin {
    fn find_gemini_cli() -> Result<String, String> {
        // Check for gemini CLI tool
        if let Ok(path) = which("gemini") {
            return Ok(path.to_string_lossy().to_string());
        }
        Err("Gemini CLI not found. This plugin is not yet implemented.".to_string())
    }
}

#[async_trait]
impl AIPlugin for GeminiPlugin {
    fn is_available(&self) -> bool {
        Self::find_gemini_cli().is_ok()
    }

    fn name(&self) -> &str {
        "Gemini"
    }

    async fn chat_completion(&self, _messages: Vec<ChatMessage>) -> Result<String, String> {
        Err("Gemini plugin not yet implemented. Please contribute at github.com/jariahh/ateliercode".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_claude_availability() {
        let service = AIService::new(AIProvider::Claude);
        let _result = service.is_available();
        // Just check it doesn't panic
    }

    #[test]
    fn test_find_claude_cli() {
        let result = ClaudePlugin::find_claude_cli();
        // On CI this might fail, so we just check it doesn't panic
        println!("Claude CLI search result: {:?}", result);
    }

    #[test]
    fn test_provider_from_string() {
        assert!(matches!(AIProvider::from_str("claude"), Some(AIProvider::Claude)));
        assert!(matches!(AIProvider::from_str("openai"), Some(AIProvider::OpenAI)));
        assert!(matches!(AIProvider::from_str("gpt"), Some(AIProvider::OpenAI)));
        assert!(matches!(AIProvider::from_str("gemini"), Some(AIProvider::Gemini)));
        assert!(matches!(AIProvider::from_str("google"), Some(AIProvider::Gemini)));
        assert!(AIProvider::from_str("unknown").is_none());
    }

    #[test]
    fn test_all_providers() {
        // Test that all providers can be created
        let claude = AIService::new(AIProvider::Claude);
        assert_eq!(claude.provider_name(), "Claude");

        let openai = AIService::new(AIProvider::OpenAI);
        assert_eq!(openai.provider_name(), "OpenAI");

        let gemini = AIService::new(AIProvider::Gemini);
        assert_eq!(gemini.provider_name(), "Gemini");
    }
}
