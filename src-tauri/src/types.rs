use serde::{Deserialize, Serialize};

/// Input for creating a new project
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProjectInput {
    pub name: String,
    pub root_path: String,
    pub agent_type: String,
    pub description: Option<String>,
    pub initialize_git: bool,
}

/// Input for updating a project
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProjectInput {
    pub name: Option<String>,
    pub root_path: Option<String>,
    pub agent_type: Option<String>,
    pub status: Option<String>,
    pub prd_content: Option<String>,
    pub settings: Option<String>,
}

/// Information about an installed agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentInfo {
    pub name: String,
    pub installed: bool,
    pub version: Option<String>,
    pub command: String,
}

impl AgentInfo {
    /// Create a new agent info instance
    pub fn new(name: String, command: String, installed: bool, version: Option<String>) -> Self {
        Self {
            name,
            installed,
            version,
            command,
        }
    }
}
