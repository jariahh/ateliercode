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

/// Task model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Task {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub status: String,
    pub estimated_hours: Option<f64>,
    pub actual_hours: Option<f64>,
    pub files_affected: Option<String>,
    pub depends_on: Option<String>,
    pub created_at: i64,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
}

impl Task {
    /// Create a new task instance
    pub fn new(project_id: String, title: String, priority: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            project_id,
            title,
            description: None,
            priority,
            status: "todo".to_string(),
            estimated_hours: None,
            actual_hours: None,
            files_affected: None,
            depends_on: None,
            created_at: chrono::Utc::now().timestamp(),
            started_at: None,
            completed_at: None,
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

/// File change model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FileChange {
    pub id: String,
    pub project_id: String,
    pub session_id: String,
    pub file_path: String,
    pub change_type: String,
    pub diff: Option<String>,
    pub reviewed: bool,
    pub approved: Option<bool>,
    pub timestamp: i64,
}

impl FileChange {
    /// Create a new file change entry
    pub fn new(
        project_id: String,
        session_id: String,
        file_path: String,
        change_type: String,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            project_id,
            session_id,
            file_path,
            change_type,
            diff: None,
            reviewed: false,
            approved: None,
            timestamp: chrono::Utc::now().timestamp(),
        }
    }
}

/// Review comment model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ReviewComment {
    pub id: String,
    pub file_change_id: String,
    pub line_number: Option<i64>,
    pub author: String,
    pub comment: String,
    pub timestamp: i64,
    pub resolved: bool,
}

impl ReviewComment {
    /// Create a new review comment
    pub fn new(
        file_change_id: String,
        author: String,
        comment: String,
        line_number: Option<i64>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            file_change_id,
            line_number,
            author,
            comment,
            timestamp: chrono::Utc::now().timestamp(),
            resolved: false,
        }
    }
}

/// Setting model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Setting {
    pub key: String,
    pub value: String,
}

impl Setting {
    /// Create a new setting
    pub fn new(key: String, value: String) -> Self {
        Self { key, value }
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
