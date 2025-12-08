use std::process::Command;
use which::which;

use crate::types::AgentInfo;

/// Detect all available AI coding agents on the system
pub async fn detect_all_agents() -> Vec<AgentInfo> {
    let mut agents = Vec::new();

    // Detect Claude Code
    agents.push(detect_claude_code().await);

    // Detect Aider
    agents.push(detect_aider().await);

    // Detect GitHub Copilot
    agents.push(detect_github_copilot().await);

    agents
}

/// Detect if Claude Code is installed
async fn detect_claude_code() -> AgentInfo {
    // The actual command is "claude", not "claude-code"
    let command_name = "claude";

    match which(command_name) {
        Ok(_) => {
            // Try to get version with -v flag (--version might not work)
            let version = get_command_version(command_name, &["-v"]).await;
            AgentInfo::with_display(
                "Claude Code".to_string(),
                command_name.to_string(),
                true,
                version,
                Some("Claude".to_string()),
                Some("Anthropic's Claude Code - specialized for coding tasks".to_string()),
                Some("🟣".to_string()),
                Some("purple".to_string()),
            )
        }
        Err(_) => AgentInfo::with_display(
            "Claude Code".to_string(),
            command_name.to_string(),
            false,
            None,
            Some("Claude".to_string()),
            Some("Anthropic's Claude Code - specialized for coding tasks".to_string()),
            Some("🟣".to_string()),
            Some("purple".to_string()),
        ),
    }
}

/// Detect if Aider is installed
async fn detect_aider() -> AgentInfo {
    let command_name = "aider";

    match which(command_name) {
        Ok(_) => {
            // Try to get version
            let version = get_command_version(command_name, &["--version"]).await;
            AgentInfo::with_display(
                "Aider".to_string(),
                command_name.to_string(),
                true,
                version,
                Some("Aider".to_string()),
                Some("AI pair programming in your terminal".to_string()),
                Some("🟠".to_string()),
                Some("orange".to_string()),
            )
        }
        Err(_) => AgentInfo::with_display(
            "Aider".to_string(),
            command_name.to_string(),
            false,
            None,
            Some("Aider".to_string()),
            Some("AI pair programming in your terminal".to_string()),
            Some("🟠".to_string()),
            Some("orange".to_string()),
        ),
    }
}

/// Detect if GitHub Copilot CLI is installed
async fn detect_github_copilot() -> AgentInfo {
    let command_name = "gh";

    // First check if gh command exists
    match which(command_name) {
        Ok(_) => {
            // Check if copilot extension is installed by running "gh copilot --version"
            match Command::new(command_name)
                .args(&["copilot", "--version"])
                .output()
            {
                Ok(output) => {
                    if output.status.success() {
                        let version_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                        let version = if !version_str.is_empty() {
                            Some(version_str)
                        } else {
                            None
                        };

                        AgentInfo::with_display(
                            "GitHub Copilot".to_string(),
                            "gh copilot".to_string(),
                            true,
                            version,
                            Some("Copilot".to_string()),
                            Some("GitHub Copilot - AI pair programmer".to_string()),
                            Some("🟢".to_string()),
                            Some("green".to_string()),
                        )
                    } else {
                        // gh exists but copilot extension is not installed
                        AgentInfo::with_display(
                            "GitHub Copilot".to_string(),
                            "gh copilot".to_string(),
                            false,
                            None,
                            Some("Copilot".to_string()),
                            Some("GitHub Copilot - AI pair programmer".to_string()),
                            Some("🟢".to_string()),
                            Some("green".to_string()),
                        )
                    }
                }
                Err(_) => AgentInfo::with_display(
                    "GitHub Copilot".to_string(),
                    "gh copilot".to_string(),
                    false,
                    None,
                    Some("Copilot".to_string()),
                    Some("GitHub Copilot - AI pair programmer".to_string()),
                    Some("🟢".to_string()),
                    Some("green".to_string()),
                ),
            }
        }
        Err(_) => AgentInfo::with_display(
            "GitHub Copilot".to_string(),
            "gh copilot".to_string(),
            false,
            None,
            Some("Copilot".to_string()),
            Some("GitHub Copilot - AI pair programmer".to_string()),
            Some("🟢".to_string()),
            Some("green".to_string()),
        ),
    }
}

/// Get version string from a command
async fn get_command_version(command: &str, args: &[&str]) -> Option<String> {
    match Command::new(command).args(args).output() {
        Ok(output) => {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !version.is_empty() {
                    Some(version)
                } else {
                    // Some commands output version to stderr
                    let version_err = String::from_utf8_lossy(&output.stderr).trim().to_string();
                    if !version_err.is_empty() {
                        Some(version_err)
                    } else {
                        None
                    }
                }
            } else {
                None
            }
        }
        Err(_) => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_detect_all_agents() {
        let agents = detect_all_agents().await;
        assert_eq!(agents.len(), 3);

        // Check that all agent names are present
        let names: Vec<&str> = agents.iter().map(|a| a.name.as_str()).collect();
        assert!(names.contains(&"Claude Code"));
        assert!(names.contains(&"Aider"));
        assert!(names.contains(&"GitHub Copilot"));
    }
}
