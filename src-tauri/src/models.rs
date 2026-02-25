use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Project model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub root_path: String,
    pub agent_type: String,
    pub status: String,
    pub prd_content: Option<String>,
    pub created_at: i64,
    pub last_activity: i64,
    pub settings: Option<String>,
    /// Project icon (emoji, icon name, or path to custom icon)
    pub icon: Option<String>,
    /// Project color for theming (e.g., "purple", "blue", "green")
    pub color: Option<String>,
}

impl Project {
    /// Create a new project instance
    pub fn new(name: String, root_path: String, agent_type: String) -> Self {
        let now = chrono::Utc::now().timestamp();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            root_path,
            agent_type,
            status: "active".to_string(),
            prd_content: None,
            created_at: now,
            last_activity: now,
            settings: None,
            icon: None,
            color: None,
        }
    }
}

/// Chat message model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ChatMessage {
    pub id: String,
    pub project_id: String,
    pub session_id: Option<String>,
    pub role: String,
    pub content: String,
    pub timestamp: i64,
    pub metadata: Option<String>,
}

impl ChatMessage {
    /// Create a new chat message instance
    #[allow(dead_code)]
    pub fn new(project_id: String, role: String, content: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            project_id,
            session_id: None,
            role,
            content,
            timestamp: chrono::Utc::now().timestamp(),
            metadata: None,
        }
    }

    /// Create a new chat message instance with session_id
    pub fn new_with_session(
        project_id: String,
        session_id: Option<String>,
        role: String,
        content: String,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            project_id,
            session_id,
            role,
            content,
            timestamp: chrono::Utc::now().timestamp(),
            metadata: None,
        }
    }
}

/// Agent session model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AgentSession {
    pub id: String,
    pub project_id: String,
    pub task_id: Option<String>,
    pub agent_type: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub status: String,
    pub exit_code: Option<i64>,
    pub claude_session_id: Option<String>,
}

impl AgentSession {
    /// Create a new agent session instance
    #[allow(dead_code)]
    pub fn new(project_id: String, agent_type: String, task_id: Option<String>) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            project_id,
            task_id,
            agent_type,
            started_at: chrono::Utc::now().timestamp(),
            ended_at: None,
            status: "running".to_string(),
            exit_code: None,
            claude_session_id: None,
        }
    }
}

/// Activity log model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ActivityLog {
    pub id: String,
    pub project_id: String,
    pub session_id: Option<String>,
    pub event_type: String,
    pub description: String,
    pub data: Option<String>,
    pub timestamp: i64,
}

impl ActivityLog {
    /// Create a new activity log entry
    pub fn new(
        project_id: String,
        session_id: Option<String>,
        event_type: String,
        description: String,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            project_id,
            session_id,
            event_type,
            description,
            data: None,
            timestamp: chrono::Utc::now().timestamp(),
        }
    }
}

/// Chat tab model - represents an open chat tab in the UI
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ChatTab {
    pub id: String,
    pub project_id: String,
    pub agent_type: String,
    pub session_id: Option<String>,
    pub cli_session_id: Option<String>,
    pub label: Option<String>,
    pub tab_order: i64,
    pub is_active: bool,
    pub created_at: i64,
    pub last_activity: i64,
}

impl ChatTab {
    /// Create a new chat tab
    pub fn new(project_id: String, agent_type: String, tab_order: i64) -> Self {
        let now = chrono::Utc::now().timestamp();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            project_id,
            agent_type,
            session_id: None,
            cli_session_id: None,
            label: None,
            tab_order,
            is_active: false,
            created_at: now,
            last_activity: now,
        }
    }
}
