use anyhow::{Context, Result};
use tauri::State;

use crate::agents;
use crate::db::Database;
use crate::models::Project;
use crate::types::{AgentInfo, CreateProjectInput, UpdateProjectInput};

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
