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
    /// Project icon (emoji, icon name, or path to custom icon)
    pub icon: Option<String>,
    /// Project color for theming (e.g., "purple", "blue", "green")
    pub color: Option<String>,
}

/// Information about an installed agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentInfo {
    pub name: String,
    pub installed: bool,
    pub version: Option<String>,
    pub command: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Display icon (emoji like "🟣" or icon name)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    /// Primary color name for theming (e.g., "purple", "blue", "green")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
}

impl AgentInfo {
    /// Create a new agent info instance
    pub fn new(name: String, command: String, installed: bool, version: Option<String>) -> Self {
        Self {
            name,
            installed,
            version,
            command,
            display_name: None,
            description: None,
            icon: None,
            color: None,
        }
    }

    /// Create a new agent info instance with display options
    pub fn with_display(
        name: String,
        command: String,
        installed: bool,
        version: Option<String>,
        display_name: Option<String>,
        description: Option<String>,
        icon: Option<String>,
        color: Option<String>,
    ) -> Self {
        Self {
            name,
            installed,
            version,
            command,
            display_name,
            description,
            icon,
            color,
        }
    }
}

/// Input for creating a new task
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTaskInput {
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
}

/// Input for updating a task
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub estimated_hours: Option<f64>,
    pub actual_hours: Option<f64>,
    pub files_affected: Option<String>,
    pub depends_on: Option<String>,
}

/// Project statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectStats {
    pub files_changed: usize,
    pub commits: usize,
    pub messages: usize,
    pub tasks_completed: usize,
    pub tasks_total: usize,
}

/// Result of project analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectAnalysisResult {
    pub suggested_name: String,
    pub suggested_description: String,
    pub detected_languages: Vec<String>,
    pub detected_frameworks: Vec<String>,
    pub file_count: usize,
    pub has_git: bool,
}

/// AI-generated project details (for modal preview)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIProjectDetails {
    pub name: String,
    pub description: String,
}
