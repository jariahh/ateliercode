use anyhow::{Context, Result};
use tauri::State;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use ignore::WalkBuilder;

use crate::agents;
use crate::db::Database;
use crate::file_watcher::FileWatcherManager;
use crate::models::{Project, ChatMessage, Task, ActivityLog, FileChange};
use crate::project_analyzer;
use crate::types::{AgentInfo, CreateProjectInput, UpdateProjectInput, CreateTaskInput, UpdateTaskInput, ProjectStats, ProjectAnalysisResult};

/// Create a new project
#[tauri::command]
pub async fn create_project(
    db: State<'_, Database>,
    input: CreateProjectInput,
) -> Result<Project, String> {
    log::info!("Creating project: {}", input.name);

    // Create project instance
    let mut project = Project::new(input.name, input.root_path.clone(), input.agent_type);

    // Set PRD content if description is provided
    if let Some(description) = input.description {
        project.prd_content = Some(description);
    }

    // Initialize git repository if requested
    if input.initialize_git {
        if let Err(e) = initialize_git_repo(&input.root_path).await {
            log::warn!("Failed to initialize git repository: {}", e);
            // Don't fail the project creation if git init fails
        }
    }

    // Insert into database
    sqlx::query(
        r#"
        INSERT INTO projects (id, name, root_path, agent_type, status, prd_content, created_at, last_activity, settings)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&project.id)
    .bind(&project.name)
    .bind(&project.root_path)
    .bind(&project.agent_type)
    .bind(&project.status)
    .bind(&project.prd_content)
    .bind(project.created_at)
    .bind(project.last_activity)
    .bind(&project.settings)
    .execute(db.pool())
    .await
    .map_err(|e| format!("Failed to create project: {}", e))?;

    log::info!("Project created successfully: {}", project.id);
    Ok(project)
}

/// Get all projects
#[tauri::command]
pub async fn get_projects(db: State<'_, Database>) -> Result<Vec<Project>, String> {
    log::info!("Fetching all projects");

    let projects = sqlx::query_as::<_, Project>(
        r#"
        SELECT id, name, root_path, agent_type, status, prd_content, created_at, last_activity, settings
        FROM projects
        ORDER BY last_activity DESC
        "#
    )
    .fetch_all(db.pool())
    .await
    .map_err(|e| format!("Failed to fetch projects: {}", e))?;

    log::info!("Fetched {} projects", projects.len());
    Ok(projects)
}

/// Get a single project by ID
#[tauri::command]
pub async fn get_project(db: State<'_, Database>, id: String) -> Result<Option<Project>, String> {
    log::info!("Fetching project: {}", id);

    let project = sqlx::query_as::<_, Project>(
        r#"
        SELECT id, name, root_path, agent_type, status, prd_content, created_at, last_activity, settings
        FROM projects
        WHERE id = ?
        "#
    )
    .bind(&id)
    .fetch_optional(db.pool())
    .await
    .map_err(|e| format!("Failed to fetch project: {}", e))?;

    if project.is_some() {
        log::info!("Project found: {}", id);
    } else {
        log::warn!("Project not found: {}", id);
    }

    Ok(project)
}

/// Update a project
#[tauri::command]
pub async fn update_project(
    db: State<'_, Database>,
    id: String,
    updates: UpdateProjectInput,
) -> Result<Project, String> {
    log::info!("Updating project: {}", id);

    // First, fetch the existing project
    let mut project = get_project(db.clone(), id.clone())
        .await?
        .ok_or_else(|| format!("Project not found: {}", id))?;

    // Apply updates
    if let Some(name) = updates.name {
        project.name = name;
    }
    if let Some(root_path) = updates.root_path {
        project.root_path = root_path;
    }
    if let Some(agent_type) = updates.agent_type {
        project.agent_type = agent_type;
    }
    if let Some(status) = updates.status {
        project.status = status;
    }
    if let Some(prd_content) = updates.prd_content {
        project.prd_content = Some(prd_content);
    }
    if let Some(settings) = updates.settings {
        project.settings = Some(settings);
    }

    // Update last_activity
    project.last_activity = chrono::Utc::now().timestamp();

    // Update in database
    sqlx::query(
        r#"
        UPDATE projects
        SET name = ?, root_path = ?, agent_type = ?, status = ?, prd_content = ?, last_activity = ?, settings = ?
        WHERE id = ?
        "#
    )
    .bind(&project.name)
    .bind(&project.root_path)
    .bind(&project.agent_type)
    .bind(&project.status)
    .bind(&project.prd_content)
    .bind(project.last_activity)
    .bind(&project.settings)
    .bind(&id)
    .execute(db.pool())
    .await
    .map_err(|e| format!("Failed to update project: {}", e))?;

    log::info!("Project updated successfully: {}", id);
    Ok(project)
}

/// Delete a project
#[tauri::command]
pub async fn delete_project(db: State<'_, Database>, id: String) -> Result<bool, String> {
    log::info!("Deleting project: {}", id);

    let result = sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(&id)
        .execute(db.pool())
        .await
        .map_err(|e| format!("Failed to delete project: {}", e))?;

    let deleted = result.rows_affected() > 0;

    if deleted {
        log::info!("Project deleted successfully: {}", id);
    } else {
        log::warn!("Project not found for deletion: {}", id);
    }

    Ok(deleted)
}

/// Detect installed AI coding agents
#[tauri::command]
pub async fn detect_agents() -> Result<Vec<AgentInfo>, String> {
    log::info!("Detecting installed agents");

    let agents = agents::detect_all_agents().await;

    log::info!(
        "Detected {} agents ({} installed)",
        agents.len(),
        agents.iter().filter(|a| a.installed).count()
    );

    Ok(agents)
}

/// Open native folder picker dialog
#[tauri::command]
pub async fn select_folder(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    log::info!("Opening folder picker dialog");

    use tauri_plugin_dialog::DialogExt;

    let folder = app_handle
        .dialog()
        .file()
        .blocking_pick_folder();

    match folder {
        Some(path) => {
            let path_str = path.to_string();
            log::info!("Folder selected: {}", path_str);
            Ok(Some(path_str))
        }
        None => {
            log::info!("Folder selection cancelled");
            Ok(None)
        }
    }
}

/// Initialize a git repository in the given path
async fn initialize_git_repo(path: &str) -> Result<()> {
    use std::process::Command;

    log::info!("Initializing git repository at: {}", path);

    let output = Command::new("git")
        .args(&["init"])
        .current_dir(path)
        .output()
        .context("Failed to execute git init")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Git init failed: {}", error);
    }

    log::info!("Git repository initialized successfully");
    Ok(())
}

// ============================================================================
// Task Management Commands
// ============================================================================

/// Create a new task
#[tauri::command]
pub async fn create_task(
    db: State<'_, Database>,
    input: CreateTaskInput,
) -> Result<Task, String> {
    log::info!("Creating task: {}", input.title);

    // Create task instance
    let mut task = Task::new(input.project_id.clone(), input.title, input.priority);

    // Set optional description
    if let Some(description) = input.description {
        task.description = Some(description);
    }

    // Insert into database
    sqlx::query(
        r#"
        INSERT INTO tasks (id, project_id, title, description, priority, status, estimated_hours,
                          actual_hours, files_affected, depends_on, created_at, started_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&task.id)
    .bind(&task.project_id)
    .bind(&task.title)
    .bind(&task.description)
    .bind(&task.priority)
    .bind(&task.status)
    .bind(task.estimated_hours)
    .bind(task.actual_hours)
    .bind(&task.files_affected)
    .bind(&task.depends_on)
    .bind(task.created_at)
    .bind(task.started_at)
    .bind(task.completed_at)
    .execute(db.pool())
    .await
    .map_err(|e| format!("Failed to create task: {}", e))?;

    log::info!("Task created successfully: {}", task.id);
    Ok(task)
}

/// Get all tasks for a project
#[tauri::command]
pub async fn get_tasks(db: State<'_, Database>, project_id: String) -> Result<Vec<Task>, String> {
    log::info!("Fetching tasks for project: {}", project_id);

    let tasks = sqlx::query_as::<_, Task>(
        r#"
        SELECT id, project_id, title, description, priority, status, estimated_hours,
               actual_hours, files_affected, depends_on, created_at, started_at, completed_at
        FROM tasks
        WHERE project_id = ?
        ORDER BY created_at DESC
        "#
    )
    .bind(&project_id)
    .fetch_all(db.pool())
    .await
    .map_err(|e| format!("Failed to fetch tasks: {}", e))?;

    log::info!("Fetched {} tasks for project {}", tasks.len(), project_id);
    Ok(tasks)
}

/// Update a task
#[tauri::command]
pub async fn update_task(
    db: State<'_, Database>,
    task_id: String,
    updates: UpdateTaskInput,
) -> Result<Task, String> {
    log::info!("Updating task: {}", task_id);

    // First, fetch the existing task
    let mut task = sqlx::query_as::<_, Task>(
        r#"
        SELECT id, project_id, title, description, priority, status, estimated_hours,
               actual_hours, files_affected, depends_on, created_at, started_at, completed_at
        FROM tasks
        WHERE id = ?
        "#
    )
    .bind(&task_id)
    .fetch_optional(db.pool())
    .await
    .map_err(|e| format!("Failed to fetch task: {}", e))?
    .ok_or_else(|| format!("Task not found: {}", task_id))?;

    // Track if task is being completed for activity logging
    let mut task_completed = false;

    // Apply updates
    if let Some(title) = updates.title {
        task.title = title;
    }
    if let Some(description) = updates.description {
        task.description = Some(description);
    }
    if let Some(priority) = updates.priority {
        task.priority = priority;
    }
    if let Some(status) = updates.status {
        // Update status-related timestamps
        if status == "in_progress" && task.started_at.is_none() {
            task.started_at = Some(chrono::Utc::now().timestamp());
        } else if status == "completed" && task.completed_at.is_none() {
            task.completed_at = Some(chrono::Utc::now().timestamp());
            task_completed = true;
        }
        task.status = status;
    }
    if let Some(estimated_hours) = updates.estimated_hours {
        task.estimated_hours = Some(estimated_hours);
    }
    if let Some(actual_hours) = updates.actual_hours {
        task.actual_hours = Some(actual_hours);
    }
    if let Some(files_affected) = updates.files_affected {
        task.files_affected = Some(files_affected);
    }
    if let Some(depends_on) = updates.depends_on {
        task.depends_on = Some(depends_on);
    }

    // Update in database
    sqlx::query(
        r#"
        UPDATE tasks
        SET title = ?, description = ?, priority = ?, status = ?, estimated_hours = ?,
            actual_hours = ?, files_affected = ?, depends_on = ?, started_at = ?, completed_at = ?
        WHERE id = ?
        "#
    )
    .bind(&task.title)
    .bind(&task.description)
    .bind(&task.priority)
    .bind(&task.status)
    .bind(task.estimated_hours)
    .bind(task.actual_hours)
    .bind(&task.files_affected)
    .bind(&task.depends_on)
    .bind(task.started_at)
    .bind(task.completed_at)
    .bind(&task_id)
    .execute(db.pool())
    .await
    .map_err(|e| format!("Failed to update task: {}", e))?;

    log::info!("Task updated successfully: {}", task_id);

    // Log activity if task was completed
    if task_completed {
        let _ = log_activity(
            db,
            task.project_id.clone(),
            "task_complete".to_string(),
            format!("Task completed: {}", task.title),
            Some(serde_json::json!({
                "task_id": task.id,
                "title": task.title
            }).to_string()),
        ).await;
    }

    Ok(task)
}

/// Delete a task
#[tauri::command]
pub async fn delete_task(db: State<'_, Database>, task_id: String) -> Result<bool, String> {
    log::info!("Deleting task: {}", task_id);

    let result = sqlx::query("DELETE FROM tasks WHERE id = ?")
        .bind(&task_id)
        .execute(db.pool())
        .await
        .map_err(|e| format!("Failed to delete task: {}", e))?;

    let deleted = result.rows_affected() > 0;

    if deleted {
        log::info!("Task deleted successfully: {}", task_id);
    } else {
        log::warn!("Task not found for deletion: {}", task_id);
    }

    Ok(deleted)
}

/// Quick update task status
#[tauri::command]
pub async fn update_task_status(
    db: State<'_, Database>,
    task_id: String,
    status: String,
) -> Result<Task, String> {
    log::info!("Updating task status: {} -> {}", task_id, status);

    // Use the generic update_task function with just the status
    let updates = UpdateTaskInput {
        title: None,
        description: None,
        priority: None,
        status: Some(status),
        estimated_hours: None,
        actual_hours: None,
        files_affected: None,
        depends_on: None,
    };

    update_task(db, task_id, updates).await
}

// ============================================================================
// File System Commands
// ============================================================================

/// File node structure representing a file or directory
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub node_type: String, // "file" or "folder"
    pub size: Option<u64>,
    pub modified: Option<i64>,
    pub children: Option<Vec<FileNode>>,
}

/// Read project files and return file tree structure
#[tauri::command]
pub async fn read_project_files(
    db: State<'_, Database>,
    #[allow(non_snake_case)]
    projectId: String,
) -> Result<Vec<FileNode>, String> {
    log::info!("Reading files for project: {}", projectId);

    // Get project from database to get the root path
    let project = get_project(db.clone(), projectId.clone())
        .await?
        .ok_or_else(|| format!("Project not found: {}", projectId))?;

    let root_path = Path::new(&project.root_path);

    // Check if path exists
    if !root_path.exists() {
        return Err(format!("Project path does not exist: {}", project.root_path));
    }

    if !root_path.is_dir() {
        return Err(format!("Project path is not a directory: {}", project.root_path));
    }

    // Build file tree respecting .gitignore
    let mut root_nodes = Vec::new();

    // Use ignore crate's WalkBuilder to respect .gitignore patterns
    let walker = WalkBuilder::new(root_path)
        .hidden(false) // Show hidden files
        .git_ignore(true) // Respect .gitignore
        .git_exclude(true) // Respect .git/info/exclude
        .ignore(true) // Respect .ignore files
        .max_depth(Some(1)) // Only get immediate children for root level
        .build();

    for entry in walker {
        match entry {
            Ok(entry) => {
                let path = entry.path();

                // Skip the root directory itself
                if path == root_path {
                    continue;
                }

                // Skip .git directory
                if path.file_name().and_then(|s| s.to_str()) == Some(".git") {
                    continue;
                }

                if let Some(node) = build_file_node(path, root_path) {
                    root_nodes.push(node);
                }
            }
            Err(e) => {
                log::warn!("Error reading file entry: {}", e);
            }
        }
    }

    // Sort: folders first, then files, alphabetically within each group
    root_nodes.sort_by(|a, b| {
        match (a.node_type.as_str(), b.node_type.as_str()) {
            ("folder", "file") => std::cmp::Ordering::Less,
            ("file", "folder") => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    log::info!("Successfully read {} items from project root", root_nodes.len());

    // Check if this is the first time reading files for this project
    // by checking if there are any file_change activity logs
    let activity_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM activity_log WHERE project_id = ? AND event_type = 'file_change'"
    )
    .bind(&project_id)
    .fetch_one(db.pool())
    .await
    .unwrap_or(0);

    // Log activity only on first read
    if activity_count == 0 && !root_nodes.is_empty() {
        let _ = log_activity(
            db,
            project_id,
            "file_change".to_string(),
            format!("Project files loaded ({} items)", root_nodes.len()),
            Some(serde_json::json!({
                "file_count": root_nodes.len()
            }).to_string()),
        ).await;
    }

    Ok(root_nodes)
}

/// Build a FileNode from a path, optionally loading children for folders
fn build_file_node(path: &Path, root_path: &Path) -> Option<FileNode> {
    let metadata = match fs::metadata(path) {
        Ok(m) => m,
        Err(e) => {
            log::warn!("Failed to read metadata for {:?}: {}", path, e);
            return None;
        }
    };

    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    // Generate a relative path-based ID
    let relative_path = path.strip_prefix(root_path).unwrap_or(path);
    let id = relative_path.to_string_lossy().replace('\\', "/");

    let node_type = if metadata.is_dir() {
        "folder"
    } else {
        "file"
    };

    let size = if metadata.is_file() {
        Some(metadata.len())
    } else {
        None
    };

    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64);

    // For folders, recursively load children
    let children = if metadata.is_dir() {
        Some(load_folder_children(path, root_path))
    } else {
        None
    };

    Some(FileNode {
        id,
        name,
        path: path.to_string_lossy().to_string(),
        node_type: node_type.to_string(),
        size,
        modified,
        children,
    })
}

/// Load children for a folder, respecting .gitignore
fn load_folder_children(folder_path: &Path, root_path: &Path) -> Vec<FileNode> {
    let mut children = Vec::new();

    let walker = WalkBuilder::new(folder_path)
        .hidden(false)
        .git_ignore(true)
        .git_exclude(true)
        .ignore(true)
        .max_depth(Some(1)) // Only immediate children
        .build();

    for entry in walker {
        match entry {
            Ok(entry) => {
                let path = entry.path();

                // Skip the folder itself
                if path == folder_path {
                    continue;
                }

                // Skip .git directory
                if path.file_name().and_then(|s| s.to_str()) == Some(".git") {
                    continue;
                }

                if let Some(node) = build_file_node(path, root_path) {
                    children.push(node);
                }
            }
            Err(e) => {
                log::warn!("Error reading file entry: {}", e);
            }
        }
    }

    // Sort: folders first, then files
    children.sort_by(|a, b| {
        match (a.node_type.as_str(), b.node_type.as_str()) {
            ("folder", "file") => std::cmp::Ordering::Less,
            ("file", "folder") => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    children
}

/// Read and return file content
#[tauri::command]
pub async fn read_file_content(
    db: State<'_, Database>,
    #[allow(non_snake_case)]
    projectId: String,
    #[allow(non_snake_case)]
    filePath: String,
) -> Result<String, String> {
    log::info!("Reading file content for project {}: {}", projectId, filePath);

    // Get project from database to verify it exists
    let project = get_project(db, projectId.clone())
        .await?
        .ok_or_else(|| format!("Project not found: {}", projectId))?;

    let root_path = Path::new(&project.root_path);
    let target_path = Path::new(&filePath);

    // Security check: ensure the file is within the project directory
    let canonical_root = root_path
        .canonicalize()
        .map_err(|e| format!("Failed to resolve project path: {}", e))?;

    let canonical_target = target_path
        .canonicalize()
        .map_err(|e| format!("Failed to resolve file path: {}", e))?;

    if !canonical_target.starts_with(&canonical_root) {
        return Err("Access denied: file is outside project directory".to_string());
    }

    // Check if file exists and is a file
    if !canonical_target.exists() {
        return Err(format!("File not found: {}", filePath));
    }

    if !canonical_target.is_file() {
        return Err(format!("Path is not a file: {}", filePath));
    }

    // Read file content
    let content = fs::read_to_string(&canonical_target)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Limit file size to prevent memory issues (e.g., 10MB)
    if content.len() > 10 * 1024 * 1024 {
        return Err("File too large to preview (max 10MB)".to_string());
    }

    log::info!("Successfully read file: {} ({} bytes)", filePath, content.len());
    Ok(content)
}

/// Send a chat message and get AI response
#[tauri::command]
pub async fn send_message(
    db: State<'_, Database>,
    project_id: String,
    content: String,
) -> Result<ChatMessage, String> {
    log::info!("Sending message for project: {}", project_id);

    // Verify project exists
    get_project(db.clone(), project_id.clone())
        .await?
        .ok_or_else(|| format!("Project not found: {}", project_id))?;

    // Create and save user message
    let user_message = ChatMessage::new(project_id.clone(), "user".to_string(), content.clone());

    sqlx::query(
        r#"
        INSERT INTO chat_messages (id, project_id, role, content, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&user_message.id)
    .bind(&user_message.project_id)
    .bind(&user_message.role)
    .bind(&user_message.content)
    .bind(user_message.timestamp)
    .bind(&user_message.metadata)
    .execute(db.pool())
    .await
    .map_err(|e| format!("Failed to save user message: {}", e))?;

    log::info!("User message saved: {}", user_message.id);

    // Track processing time
    let start_time = std::time::Instant::now();

    // Generate AI response using AI service
    let response_content = match generate_ai_response(&content).await {
        Ok(response) => response,
        Err(e) => {
            log::error!("AI service error: {}", e);
            // Fallback to mock response if AI service fails
            generate_mock_response(&content)
        }
    };

    let processing_time = start_time.elapsed().as_millis() as u64;

    // Create AI message with metadata
    let mut ai_message = ChatMessage::new(project_id.clone(), "assistant".to_string(), response_content);

    // Add processing time to metadata
    let metadata = serde_json::json!({
        "processingTime": processing_time,
        "model": "claude"
    });
    ai_message.metadata = Some(metadata.to_string());

    sqlx::query(
        r#"
        INSERT INTO chat_messages (id, project_id, role, content, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&ai_message.id)
    .bind(&ai_message.project_id)
    .bind(&ai_message.role)
    .bind(&ai_message.content)
    .bind(ai_message.timestamp)
    .bind(&ai_message.metadata)
    .execute(db.pool())
    .await
    .map_err(|e| format!("Failed to save AI message: {}", e))?;

    log::info!("AI message saved: {}", ai_message.id);

    // Update project last activity
    sqlx::query("UPDATE projects SET last_activity = ? WHERE id = ?")
        .bind(chrono::Utc::now().timestamp())
        .bind(&project_id)
        .execute(db.pool())
        .await
        .map_err(|e| format!("Failed to update project activity: {}", e))?;

    // Log activity for the message
    let _ = log_activity(
        db,
        project_id,
        "message".to_string(),
        "New message sent".to_string(),
        Some(serde_json::json!({
            "preview": if content.len() > 50 {
                format!("{}...", &content[..50])
            } else {
                content.clone()
            }
        }).to_string()),
    ).await;

    Ok(ai_message)
}

/// Get all chat messages for a project
#[tauri::command]
pub async fn get_messages(
    db: State<'_, Database>,
    project_id: String,
) -> Result<Vec<ChatMessage>, String> {
    log::info!("Fetching messages for project: {}", project_id);

    let messages = sqlx::query_as::<_, ChatMessage>(
        r#"
        SELECT id, project_id, role, content, timestamp, metadata
        FROM chat_messages
        WHERE project_id = ?
        ORDER BY timestamp ASC
        "#
    )
    .bind(&project_id)
    .fetch_all(db.pool())
    .await
    .map_err(|e| format!("Failed to fetch messages: {}", e))?;

    log::info!("Fetched {} messages", messages.len());
    Ok(messages)
}

/// Generate AI response using the AI service
async fn generate_ai_response(user_input: &str) -> Result<String, String> {
    use crate::ai_service::{AIService, ChatMessage};

    // Create AI service (defaults to Claude from environment)
    let ai_service = AIService::from_env();

    // Check if the AI provider is available
    if !ai_service.is_available() {
        return Err(format!(
            "{} CLI not found. Falling back to mock response.",
            ai_service.provider_name()
        ));
    }

    log::info!("Using {} for AI response", ai_service.provider_name());

    // Create message for the AI
    let messages = vec![ChatMessage {
        role: "user".to_string(),
        content: user_input.to_string(),
    }];

    // Call the AI service
    ai_service.chat_completion(messages).await
}

/// Generate a mock AI response (fallback when AI service is unavailable)
fn generate_mock_response(user_input: &str) -> String {
    let input_lower = user_input.to_lowercase();

    if input_lower.contains("hello") || input_lower.contains("hi") {
        return "Hello! I'm your AI coding assistant. I can help you with code, debugging, architecture questions, and more. What would you like to work on?".to_string();
    }

    if input_lower.contains("help") {
        return "I can assist you with:\n\n- Writing and refactoring code\n- Debugging issues\n- Code reviews\n- Explaining complex concepts\n- Architecture decisions\n- Best practices\n\nJust let me know what you need!".to_string();
    }

    if input_lower.contains("error") || input_lower.contains("bug") {
        return "I'd be happy to help debug that issue! To assist you better, could you:\n\n1. Share the error message\n2. Show me the relevant code\n3. Describe what you expected to happen\n\nThis will help me identify the problem quickly.".to_string();
    }

    if input_lower.contains("component") || input_lower.contains("react") {
        return format!(
            "Great! I can help you build that. Here's a starting point:\n\n```tsx\nimport {{ FC }} from 'react';\n\ninterface Props {{\n  // Define your props here\n}}\n\nexport const MyComponent: FC<Props> = (props) => {{\n  return (\n    <div className=\"p-4\">\n      {{/* Your component content */}}\n    </div>\n  );\n}};\n```\n\nWould you like me to customize this based on your specific needs?"
        );
    }

    // Default response
    format!(
        "I understand you're asking about: \"{}\"\n\nI'm a mock assistant for now, but in the full version, I'll provide detailed, context-aware responses to help with your coding tasks. This integration is working correctly - your messages are being saved to the database!\n\nIs there anything specific you'd like to know about this project?",
        user_input
    )
}

// ============================================================================
// Activity Logging Commands
// ============================================================================

/// Log an activity event
#[tauri::command]
pub async fn log_activity(
    db: State<'_, Database>,
    project_id: String,
    event_type: String,
    description: String,
    data: Option<String>,
) -> Result<ActivityLog, String> {
    log::info!("Logging activity for project {}: {} - {}", project_id, event_type, description);

    // Verify project exists
    get_project(db.clone(), project_id.clone())
        .await?
        .ok_or_else(|| format!("Project not found: {}", project_id))?;

    // Create activity log entry
    let mut activity = ActivityLog::new(
        project_id.clone(),
        None, // session_id not required for now
        event_type,
        description,
    );

    // Set optional data
    if let Some(data_value) = data {
        activity.data = Some(data_value);
    }

    // Insert into database
    sqlx::query(
        r#"
        INSERT INTO activity_log (id, project_id, session_id, event_type, description, data, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&activity.id)
    .bind(&activity.project_id)
    .bind(&activity.session_id)
    .bind(&activity.event_type)
    .bind(&activity.description)
    .bind(&activity.data)
    .bind(activity.timestamp)
    .execute(db.pool())
    .await
    .map_err(|e| format!("Failed to log activity: {}", e))?;

    // Update project last_activity timestamp
    sqlx::query("UPDATE projects SET last_activity = ? WHERE id = ?")
        .bind(activity.timestamp)
        .bind(&project_id)
        .execute(db.pool())
        .await
        .map_err(|e| format!("Failed to update project activity: {}", e))?;

    log::info!("Activity logged successfully: {}", activity.id);
    Ok(activity)
}

/// Get recent activities for a project
#[tauri::command]
pub async fn get_activities(
    db: State<'_, Database>,
    #[allow(non_snake_case)]
    projectId: String,
    limit: Option<i64>,
) -> Result<Vec<ActivityLog>, String> {
    log::info!("Fetching activities for project: {}", projectId);

    let limit_value = limit.unwrap_or(50).min(100); // Default 50, max 100

    let activities = sqlx::query_as::<_, ActivityLog>(
        r#"
        SELECT id, project_id, session_id, event_type, description, data, timestamp
        FROM activity_log
        WHERE project_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
        "#
    )
    .bind(&projectId)
    .bind(limit_value)
    .fetch_all(db.pool())
    .await
    .map_err(|e| format!("Failed to fetch activities: {}", e))?;

    log::info!("Fetched {} activities for project {}", activities.len(), projectId);
    Ok(activities)
}

/// Analyze an existing project directory
#[tauri::command]
pub async fn analyze_project_directory(path: String) -> Result<ProjectAnalysisResult, String> {
    log::info!("Analyzing project directory: {}", path);

    // Run analysis in a blocking task since it's CPU-intensive
    let result = tokio::task::spawn_blocking(move || {
        project_analyzer::analyze_project(&path)
    })
    .await
    .map_err(|e| format!("Failed to spawn analysis task: {}", e))?;

    match result {
        Ok(analysis) => {
            log::info!(
                "Project analysis complete: {} files, {} languages, {} frameworks",
                analysis.file_count,
                analysis.detected_languages.len(),
                analysis.detected_frameworks.len()
            );
            Ok(analysis)
        }
        Err(e) => {
            log::error!("Project analysis failed: {}", e);
            Err(e)
        }
    }
}

/// Update existing project details with AI-generated name and description
#[tauri::command]
pub async fn update_project_with_ai(
    db: State<'_, Database>,
    project_id: String,
) -> Result<Project, String> {
    log::info!("Updating project {} with AI", project_id);

    // Get the existing project
    let project = get_project(db.clone(), project_id.clone())
        .await?
        .ok_or_else(|| format!("Project not found: {}", project_id))?;

    // Run AI analysis on the project path
    let analysis = analyze_project_with_ai(project.root_path.clone()).await?;

    // Update the project in the database
    sqlx::query(
        r#"
        UPDATE projects
        SET name = ?, description = ?
        WHERE id = ?
        "#,
    )
    .bind(&analysis.suggested_name)
    .bind(&analysis.suggested_description)
    .execute(db.pool())
    .await
    .map_err(|e| format!("Failed to update project: {}", e))?;

    log::info!(
        "Updated project {} with AI: name='{}', desc='{}'",
        project_id,
        analysis.suggested_name,
        analysis.suggested_description
    );

    // Return the updated project
    get_project(db, project_id)
        .await?
        .ok_or_else(|| "Failed to fetch updated project".to_string())
}

/// Analyze project with AI to generate intelligent name and description
#[tauri::command]
pub async fn analyze_project_with_ai(path: String) -> Result<ProjectAnalysisResult, String> {
    log::info!("Analyzing project with AI: {}", path);

    // First, do the basic file-based analysis
    let mut analysis = analyze_project_directory(path.clone()).await?;

    // Check if AI service is available
    use crate::ai_service::{AIService, ChatMessage};
    let ai_service = AIService::from_env();

    if !ai_service.is_available() {
        log::warn!("AI service not available, using basic analysis only");
        return Ok(analysis);
    }

    log::info!("AI service available, generating intelligent description");

    // Build a context-rich prompt for the AI
    let prompt = format!(
        r#"Analyze this project directory and provide a concise name and description.

Project Path: {}
Files Found: {}
Detected Languages: {}
Detected Frameworks: {}
Has Git: {}

Based on the above information, please provide:
1. A short, descriptive project name (3-5 words, use kebab-case)
2. A brief description (1-2 sentences) explaining what this project does

Format your response exactly as:
NAME: your-project-name
DESCRIPTION: Your project description here.

Be concise and professional. Focus on what the project appears to do based on its tech stack."#,
        path,
        analysis.file_count,
        analysis.detected_languages.join(", "),
        analysis.detected_frameworks.join(", "),
        if analysis.has_git { "Yes" } else { "No" }
    );

    // Call AI service
    let messages = vec![ChatMessage {
        role: "user".to_string(),
        content: prompt,
    }];

    match ai_service.chat_completion(messages).await {
        Ok(response) => {
            log::info!("AI analysis complete");

            // Parse the AI response
            let lines: Vec<&str> = response.lines().collect();
            for line in lines {
                if let Some(name) = line.strip_prefix("NAME:") {
                    analysis.suggested_name = name.trim().to_string();
                } else if let Some(desc) = line.strip_prefix("DESCRIPTION:") {
                    analysis.suggested_description = desc.trim().to_string();
                }
            }

            // If parsing failed, use a fallback
            if analysis.suggested_name.is_empty() {
                log::warn!("Failed to parse AI name, using fallback");
                analysis.suggested_name = path
                    .split(&['/', '\\'][..])
                    .last()
                    .unwrap_or("my-project")
                    .to_string();
            }

            if analysis.suggested_description.is_empty() {
                log::warn!("Failed to parse AI description, using fallback");
                analysis.suggested_description = format!(
                    "A {} project using {}",
                    analysis.detected_languages.first().unwrap_or(&"software".to_string()),
                    analysis.detected_frameworks.first().unwrap_or(&"custom frameworks".to_string())
                );
            }

            log::info!("AI suggested name: {}", analysis.suggested_name);
            log::info!("AI suggested description: {}", analysis.suggested_description);

            Ok(analysis)
        }
        Err(e) => {
            log::error!("AI analysis failed: {}, using basic analysis", e);
            // Still return the basic analysis on error
            Ok(analysis)
        }
    }
}

// ============================================================================
// Statistics Commands
// ============================================================================

/// Get project statistics
#[tauri::command]
pub async fn get_project_stats(
    db: State<'_, Database>,
    #[allow(non_snake_case)]
    projectId: String,
) -> Result<ProjectStats, String> {
    log::info!("Fetching stats for project: {}", projectId);

    // Verify project exists
    let project = get_project(db.clone(), projectId.clone())
        .await?
        .ok_or_else(|| format!("Project not found: {}", projectId))?;

    // Count distinct files changed
    let files_changed_result = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(DISTINCT file_path)
        FROM file_changes
        WHERE project_id = ?
        "#
    )
    .bind(&projectId)
    .fetch_one(db.pool())
    .await;

    let files_changed = files_changed_result.unwrap_or(0) as usize;

    // Count commits from git
    let commits = count_git_commits(&project.root_path).await.unwrap_or(0);

    // Count chat messages
    let messages_result = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM chat_messages
        WHERE project_id = ?
        "#
    )
    .bind(&projectId)
    .fetch_one(db.pool())
    .await;

    let messages = messages_result.unwrap_or(0) as usize;

    // Count completed tasks
    let tasks_completed_result = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM tasks
        WHERE project_id = ? AND status = 'completed'
        "#
    )
    .bind(&projectId)
    .fetch_one(db.pool())
    .await;

    let tasks_completed = tasks_completed_result.unwrap_or(0) as usize;

    // Count total tasks
    let tasks_total_result = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM tasks
        WHERE project_id = ?
        "#
    )
    .bind(&projectId)
    .fetch_one(db.pool())
    .await;

    let tasks_total = tasks_total_result.unwrap_or(0) as usize;

    let stats = ProjectStats {
        files_changed,
        commits,
        messages,
        tasks_completed,
        tasks_total,
    };

    log::info!("Project stats: {:?}", stats);
    Ok(stats)
}

/// Count commits in a git repository
async fn count_git_commits(path: &str) -> Result<usize> {
    use std::process::Command;

    log::debug!("Counting git commits in: {}", path);

    // Check if git is available and the path is a git repository
    let check_output = Command::new("git")
        .args(&["rev-parse", "--git-dir"])
        .current_dir(path)
        .output();

    match check_output {
        Ok(output) if output.status.success() => {
            // It's a git repo, count commits
            let count_output = Command::new("git")
                .args(&["rev-list", "--count", "HEAD"])
                .current_dir(path)
                .output()
                .context("Failed to execute git rev-list")?;

            if count_output.status.success() {
                let count_str = String::from_utf8_lossy(&count_output.stdout);
                let count = count_str.trim().parse::<usize>().unwrap_or(0);
                log::debug!("Found {} commits", count);
                Ok(count)
            } else {
                // No commits yet (empty repository)
                log::debug!("Empty git repository (no commits)");
                Ok(0)
            }
        }
        _ => {
            // Not a git repository or git not available
            log::debug!("Not a git repository or git not available");
            Ok(0)
        }
    }
}

// ============================================================================
// File Watcher Commands
// ============================================================================

/// Start watching a project for file changes
#[tauri::command]
pub async fn start_watching_project(
    db: State<'_, Database>,
    watcher: State<'_, FileWatcherManager>,
    project_id: String,
) -> Result<String, String> {
    log::info!("Starting file watcher for project: {}", project_id);

    // Get project to verify it exists and get the path
    let project = get_project(db.clone(), project_id.clone())
        .await?
        .ok_or_else(|| format!("Project not found: {}", project_id))?;

    // Start watching
    let session_id = watcher
        .start_watching(project_id.clone(), project.root_path, db.pool().clone())
        .await
        .map_err(|e| format!("Failed to start watching: {}", e))?;

    log::info!("File watcher started for project {} with session {}", project_id, session_id);
    Ok(session_id)
}

/// Stop watching a project
#[tauri::command]
pub async fn stop_watching_project(
    watcher: State<'_, FileWatcherManager>,
    project_id: String,
) -> Result<bool, String> {
    log::info!("Stopping file watcher for project: {}", project_id);

    watcher
        .stop_watching(&project_id)
        .map_err(|e| format!("Failed to stop watching: {}", e))?;

    log::info!("File watcher stopped for project {}", project_id);
    Ok(true)
}

/// Check if a project is being watched
#[tauri::command]
pub async fn is_watching_project(
    watcher: State<'_, FileWatcherManager>,
    project_id: String,
) -> Result<bool, String> {
    Ok(watcher.is_watching(&project_id))
}

/// Get pending file changes for a project
#[tauri::command]
pub async fn get_pending_changes(
    db: State<'_, Database>,
    project_id: String,
) -> Result<Vec<FileChange>, String> {
    log::info!("Fetching pending changes for project: {}", project_id);

    let changes = sqlx::query_as::<_, FileChange>(
        r#"
        SELECT id, project_id, session_id, file_path, change_type, diff, reviewed, approved, timestamp
        FROM file_changes
        WHERE project_id = ? AND reviewed = FALSE
        ORDER BY timestamp DESC
        "#
    )
    .bind(&project_id)
    .fetch_all(db.pool())
    .await
    .map_err(|e| format!("Failed to fetch pending changes: {}", e))?;

    log::info!("Found {} pending changes for project {}", changes.len(), project_id);
    Ok(changes)
}

/// Get all file changes for a project (including reviewed ones)
#[tauri::command]
pub async fn get_all_changes(
    db: State<'_, Database>,
    project_id: String,
    limit: Option<i64>,
) -> Result<Vec<FileChange>, String> {
    log::info!("Fetching all changes for project: {}", project_id);

    let limit_value = limit.unwrap_or(100).min(500);

    let changes = sqlx::query_as::<_, FileChange>(
        r#"
        SELECT id, project_id, session_id, file_path, change_type, diff, reviewed, approved, timestamp
        FROM file_changes
        WHERE project_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
        "#
    )
    .bind(&project_id)
    .bind(limit_value)
    .fetch_all(db.pool())
    .await
    .map_err(|e| format!("Failed to fetch changes: {}", e))?;

    log::info!("Found {} changes for project {}", changes.len(), project_id);
    Ok(changes)
}

/// Approve a file change
#[tauri::command]
pub async fn approve_change(
    db: State<'_, Database>,
    change_id: String,
) -> Result<FileChange, String> {
    log::info!("Approving change: {}", change_id);

    // Update the change
    sqlx::query(
        r#"
        UPDATE file_changes
        SET reviewed = TRUE, approved = TRUE
        WHERE id = ?
        "#
    )
    .bind(&change_id)
    .execute(db.pool())
    .await
    .map_err(|e| format!("Failed to approve change: {}", e))?;

    // Fetch the updated change
    let change = sqlx::query_as::<_, FileChange>(
        r#"
        SELECT id, project_id, session_id, file_path, change_type, diff, reviewed, approved, timestamp
        FROM file_changes
        WHERE id = ?
        "#
    )
    .bind(&change_id)
    .fetch_one(db.pool())
    .await
    .map_err(|e| format!("Failed to fetch updated change: {}", e))?;

    log::info!("Change approved: {}", change_id);
    Ok(change)
}

/// Reject a file change
#[tauri::command]
pub async fn reject_change(
    db: State<'_, Database>,
    change_id: String,
) -> Result<FileChange, String> {
    log::info!("Rejecting change: {}", change_id);

    // Update the change
    sqlx::query(
        r#"
        UPDATE file_changes
        SET reviewed = TRUE, approved = FALSE
        WHERE id = ?
        "#
    )
    .bind(&change_id)
    .execute(db.pool())
    .await
    .map_err(|e| format!("Failed to reject change: {}", e))?;

    // Fetch the updated change
    let change = sqlx::query_as::<_, FileChange>(
        r#"
        SELECT id, project_id, session_id, file_path, change_type, diff, reviewed, approved, timestamp
        FROM file_changes
        WHERE id = ?
        "#
    )
    .bind(&change_id)
    .fetch_one(db.pool())
    .await
    .map_err(|e| format!("Failed to fetch updated change: {}", e))?;

    log::info!("Change rejected: {}", change_id);
    Ok(change)
}

/// Get the diff content for a file change
#[tauri::command]
pub async fn get_file_diff(
    db: State<'_, Database>,
    change_id: String,
) -> Result<String, String> {
    log::info!("Fetching diff for change: {}", change_id);

    let change = sqlx::query_as::<_, FileChange>(
        r#"
        SELECT id, project_id, session_id, file_path, change_type, diff, reviewed, approved, timestamp
        FROM file_changes
        WHERE id = ?
        "#
    )
    .bind(&change_id)
    .fetch_one(db.pool())
    .await
    .map_err(|e| format!("Failed to fetch change: {}", e))?;

    Ok(change.diff.unwrap_or_default())
}

// ============================================================================
// Agent Session Commands
// ============================================================================
// TODO: Fix PTY Sync issues before enabling these commands

/*
/// Start an agent session for a project
#[tauri::command]
pub async fn start_agent_session(
    db: State<'_, Database>,
    agent_manager: State<'_, crate::agent_manager::AgentManager>,
    project_id: String,
    agent_type: String,
) -> Result<crate::agent_manager::AgentSession, String> {
    log::info!("Starting {} agent session for project: {}", agent_type, project_id);

    // Get project to verify it exists and get the root path
    let project = get_project(db.clone(), project_id.clone())
        .await?
        .ok_or_else(|| format!("Project not found: {}", project_id))?;

    // Start the agent session
    let session = agent_manager
        .start_session(project_id.clone(), agent_type.clone(), project.root_path.clone())
        .await
        .map_err(|e| format!("Failed to start agent session: {}", e))?;

    // Save the session to the database
    sqlx::query(
        r#"
        INSERT INTO agent_sessions (id, project_id, task_id, agent_type, started_at, ended_at, status, exit_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&session.session_id)
    .bind(&session.project_id)
    .bind::<Option<String>>(None) // task_id
    .bind(&session.agent_type)
    .bind(session.started_at)
    .bind::<Option<i64>>(None) // ended_at
    .bind("running")
    .bind::<Option<i64>>(None) // exit_code
    .execute(db.pool())
    .await
    .map_err(|e| format!("Failed to save agent session: {}", e))?;

    // Log activity
    let _ = log_activity(
        db,
        project_id,
        "agent_start".to_string(),
        format!("Started {} agent session", agent_type),
        Some(serde_json::json!({
            "session_id": session.session_id,
            "agent_type": agent_type
        }).to_string()),
    ).await;

    log::info!("Agent session started: {}", session.session_id);
    Ok(session)
}

/// Send a message to an agent session
#[tauri::command]
pub async fn send_to_agent(
    agent_manager: State<'_, crate::agent_manager::AgentManager>,
    session_id: String,
    message: String,
) -> Result<(), String> {
    log::info!("Sending message to agent session {}: {}", session_id, message);

    agent_manager
        .send_message(&session_id, message)
        .await
        .map_err(|e| format!("Failed to send message: {}", e))?;

    Ok(())
}

/// Read output from an agent session
#[tauri::command]
pub async fn read_agent_output(
    agent_manager: State<'_, crate::agent_manager::AgentManager>,
    session_id: String,
    timeout_ms: Option<u64>,
) -> Result<Vec<String>, String> {
    log::info!("Reading output from agent session: {}", session_id);

    let output = if let Some(timeout) = timeout_ms {
        agent_manager
            .read_output_with_timeout(&session_id, timeout)
            .await
    } else {
        agent_manager
            .read_output(&session_id)
            .await
    }
    .map_err(|e| format!("Failed to read output: {}", e))?;

    Ok(output)
}

/// Stop an agent session
#[tauri::command]
pub async fn stop_agent_session(
    db: State<'_, Database>,
    agent_manager: State<'_, crate::agent_manager::AgentManager>,
    session_id: String,
) -> Result<(), String> {
    log::info!("Stopping agent session: {}", session_id);

    // Stop the session
    agent_manager
        .stop_session(&session_id)
        .await
        .map_err(|e| format!("Failed to stop session: {}", e))?;

    // Update the session in the database
    let now = chrono::Utc::now().timestamp();
    sqlx::query(
        r#"
        UPDATE agent_sessions
        SET ended_at = ?, status = 'stopped'
        WHERE id = ?
        "#
    )
    .bind(now)
    .bind(&session_id)
    .execute(db.pool())
    .await
    .map_err(|e| format!("Failed to update agent session: {}", e))?;

    log::info!("Agent session stopped: {}", session_id);
    Ok(())
}

/// Get the status of an agent session
#[tauri::command]
pub async fn get_agent_status(
    agent_manager: State<'_, crate::agent_manager::AgentManager>,
    session_id: String,
) -> Result<crate::agent_manager::AgentSession, String> {
    log::info!("Getting status for agent session: {}", session_id);

    let session = agent_manager
        .get_session_status(&session_id)
        .await
        .map_err(|e| format!("Failed to get session status: {}", e))?;

    Ok(session)
}

/// List all active agent sessions
#[tauri::command]
pub async fn list_agent_sessions(
    agent_manager: State<'_, crate::agent_manager::AgentManager>,
) -> Result<Vec<crate::agent_manager::AgentSession>, String> {
    log::info!("Listing all agent sessions");

    let sessions = agent_manager.list_sessions().await;

    Ok(sessions)
}

/// Check if an agent session is healthy
#[tauri::command]
pub async fn check_agent_health(
    agent_manager: State<'_, crate::agent_manager::AgentManager>,
    session_id: String,
) -> Result<bool, String> {
    log::info!("Checking health for agent session: {}", session_id);

    let is_healthy = agent_manager
        .health_check(&session_id)
        .await
        .map_err(|e| format!("Failed to check health: {}", e))?;

    Ok(is_healthy)
}

/// Parse agent output into structured events
#[tauri::command]
pub async fn parse_agent_output(
    session_id: String,
    agent_type: String,
    output: Vec<String>,
) -> Result<crate::agent_adapter::ParsedOutput, String> {
    log::info!("Parsing output from {} agent session: {}", agent_type, session_id);

    use crate::agent_adapter::AgentAdapter;

    // Create the appropriate adapter based on agent type
    let adapter: Box<dyn AgentAdapter> = match agent_type.to_lowercase().as_str() {
        "claude" | "claude-code" => {
            Box::new(crate::adapters::ClaudeCodeAdapter::new(session_id.clone()))
        }
        "aider" => {
            Box::new(crate::agent_adapter::AiderAdapter::new(session_id.clone()))
        }
        _ => {
            return Err(format!("Unsupported agent type: {}", agent_type));
        }
    };

    // Parse the output
    let parsed = adapter.parse_output(&session_id, &output);

    Ok(parsed)
}
*/

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_detect_agents() {
        let result = detect_agents().await;
        assert!(result.is_ok());

        let agents = result.unwrap();
        assert_eq!(agents.len(), 3);
    }
}
