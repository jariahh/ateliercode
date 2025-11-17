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
    let command_name = "claude-code";

    match which(command_name) {
        Ok(_) => {
            // Try to get version
            let version = get_command_version(command_name, &["--version"]).await;
            AgentInfo::new(
                "Claude Code".to_string(),
                command_name.to_string(),
                true,
                version,
            )
        }
        Err(_) => AgentInfo::new(
            "Claude Code".to_string(),
            command_name.to_string(),
            false,
            None,
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
            AgentInfo::new(
                "Aider".to_string(),
                command_name.to_string(),
                true,
                version,
            )
        }
        Err(_) => AgentInfo::new(
            "Aider".to_string(),
            command_name.to_string(),
            false,
            None,
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

                        AgentInfo::new(
                            "GitHub Copilot".to_string(),
                            "gh copilot".to_string(),
                            true,
                            version,
                        )
                    } else {
                        // gh exists but copilot extension is not installed
                        AgentInfo::new(
                            "GitHub Copilot".to_string(),
                            "gh copilot".to_string(),
                            false,
                            None,
                        )
                    }
                }
                Err(_) => AgentInfo::new(
                    "GitHub Copilot".to_string(),
                    "gh copilot".to_string(),
                    false,
                    None,
                ),
            }
        }
        Err(_) => AgentInfo::new(
            "GitHub Copilot".to_string(),
            "gh copilot".to_string(),
            false,
            None,
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
