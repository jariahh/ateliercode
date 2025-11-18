use anyhow::{Context, Result};
use ignore::gitignore::{Gitignore, GitignoreBuilder};
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;

use crate::models::FileChange;

/// Manages file system watchers for projects
pub struct FileWatcherManager {
    watchers: Arc<Mutex<HashMap<String, ProjectWatcher>>>,
}

struct ProjectWatcher {
    _watcher: RecommendedWatcher,
    session_id: String,
}

impl FileWatcherManager {
    /// Create a new FileWatcherManager
    pub fn new() -> Self {
        Self {
            watchers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Start watching a project directory
    pub async fn start_watching(
        &self,
        project_id: String,
        project_path: String,
        db_pool: SqlitePool,
    ) -> Result<String> {
        // Check if already watching
        {
            let watchers = self.watchers.lock().unwrap();
            if watchers.contains_key(&project_id) {
                return Err(anyhow::anyhow!("Project is already being watched"));
            }
        }

        // Create a new session ID for this watch session
        let session_id = uuid::Uuid::new_v4().to_string();

        // Create session in database
        let now = chrono::Utc::now().timestamp();
        sqlx::query(
            r#"
            INSERT INTO agent_sessions (id, project_id, agent_type, started_at, status)
            VALUES (?, ?, 'file_watcher', ?, 'running')
            "#,
        )
        .bind(&session_id)
        .bind(&project_id)
        .bind(now)
        .execute(&db_pool)
        .await
        .context("Failed to create watcher session")?;

        log::info!("Starting file watcher for project: {} at path: {}", project_id, project_path);

        // Load gitignore patterns
        let gitignore = load_gitignore(&project_path)?;

        // Create channel for file system events
        let (tx, mut rx) = mpsc::channel(100);

        // Clone for the watcher callback
        let project_path_clone = project_path.clone();
        let gitignore_clone = Arc::new(gitignore);

        // Create the watcher
        let mut watcher = RecommendedWatcher::new(
            move |result: Result<Event, notify::Error>| {
                match result {
                    Ok(event) => {
                        // Filter events based on kind
                        match event.kind {
                            EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_) => {
                                // Check each path against gitignore
                                for path in &event.paths {
                                    if should_ignore_path(path, &project_path_clone, &gitignore_clone) {
                                        continue;
                                    }

                                    // Send event through channel
                                    let _ = tx.blocking_send(event.clone());
                                    break;
                                }
                            }
                            _ => {}
                        }
                    }
                    Err(e) => log::error!("Watch error: {:?}", e),
                }
            },
            Config::default(),
        )
        .context("Failed to create file watcher")?;

        // Start watching the project directory
        watcher
            .watch(Path::new(&project_path), RecursiveMode::Recursive)
            .context("Failed to watch directory")?;

        // Store the watcher
        {
            let mut watchers = self.watchers.lock().unwrap();
            watchers.insert(
                project_id.clone(),
                ProjectWatcher {
                    _watcher: watcher,
                    session_id: session_id.clone(),
                },
            );
        }

        // Spawn a task to handle file events
        let project_id_clone = project_id.clone();
        let session_id_clone = session_id.clone();
        let project_path_clone = project_path.clone();

        tokio::spawn(async move {
            while let Some(event) = rx.recv().await {
                if let Err(e) = handle_file_event(
                    &event,
                    &project_id_clone,
                    &session_id_clone,
                    &project_path_clone,
                    &db_pool,
                )
                .await
                {
                    log::error!("Error handling file event: {}", e);
                }
            }
        });

        log::info!("File watcher started successfully for project: {}", project_id);
        Ok(session_id)
    }

    /// Stop watching a project
    pub fn stop_watching(&self, project_id: &str) -> Result<()> {
        let mut watchers = self.watchers.lock().unwrap();

        if let Some(_watcher) = watchers.remove(project_id) {
            log::info!("Stopped watching project: {}", project_id);
            Ok(())
        } else {
            Err(anyhow::anyhow!("Project is not being watched"))
        }
    }

    /// Check if a project is being watched
    pub fn is_watching(&self, project_id: &str) -> bool {
        let watchers = self.watchers.lock().unwrap();
        watchers.contains_key(project_id)
    }

    /// Get the session ID for a watched project
    pub fn get_session_id(&self, project_id: &str) -> Option<String> {
        let watchers = self.watchers.lock().unwrap();
        watchers.get(project_id).map(|w| w.session_id.clone())
    }
}

/// Handle a file system event
async fn handle_file_event(
    event: &Event,
    project_id: &str,
    session_id: &str,
    project_path: &str,
    db_pool: &SqlitePool,
) -> Result<()> {
    for path in &event.paths {
        // Determine change type
        let change_type = match event.kind {
            EventKind::Create(_) => "created",
            EventKind::Remove(_) => "deleted",
            EventKind::Modify(_) => "modified",
            _ => continue,
        };

        // Get relative path
        let relative_path = path
            .strip_prefix(project_path)
            .unwrap_or(path)
            .to_string_lossy()
            .replace('\\', "/");

        log::info!(
            "File {} detected: {} in project {}",
            change_type,
            relative_path,
            project_id
        );

        // Calculate diff for modified files
        let diff = if change_type == "modified" || change_type == "created" {
            calculate_git_diff(path, project_path).ok()
        } else {
            None
        };

        // Create file change record
        let file_change_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();

        sqlx::query(
            r#"
            INSERT INTO file_changes (id, project_id, session_id, file_path, change_type, diff, reviewed, approved, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, FALSE, NULL, ?)
            "#
        )
        .bind(&file_change_id)
        .bind(project_id)
        .bind(session_id)
        .bind(&relative_path)
        .bind(change_type)
        .bind(&diff)
        .bind(now)
        .execute(db_pool)
        .await
        .context("Failed to insert file change")?;

        // Log activity
        sqlx::query(
            r#"
            INSERT INTO activity_log (id, project_id, session_id, event_type, description, data, timestamp)
            VALUES (?, ?, ?, 'file_change', ?, ?, ?)
            "#
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(project_id)
        .bind(session_id)
        .bind(format!("File {}: {}", change_type, relative_path))
        .bind(serde_json::json!({
            "file_path": relative_path,
            "change_type": change_type,
            "change_id": file_change_id
        }).to_string())
        .bind(now)
        .execute(db_pool)
        .await
        .context("Failed to log activity")?;

        log::info!("File change recorded: {} ({})", relative_path, change_type);
    }

    Ok(())
}

/// Load gitignore patterns for a project
fn load_gitignore(project_path: &str) -> Result<Gitignore> {
    let gitignore_path = Path::new(project_path).join(".gitignore");

    let mut builder = GitignoreBuilder::new(project_path);

    if gitignore_path.exists() {
        builder
            .add(gitignore_path)
            .context("Failed to add .gitignore")?;
    }

    // Add common patterns to ignore
    builder.add_line(None, ".git/")?;
    builder.add_line(None, "node_modules/")?;
    builder.add_line(None, "target/")?;
    builder.add_line(None, "dist/")?;
    builder.add_line(None, "build/")?;
    builder.add_line(None, ".DS_Store")?;
    builder.add_line(None, "*.swp")?;
    builder.add_line(None, "*.swo")?;
    builder.add_line(None, "*~")?;

    builder.build().context("Failed to build gitignore")
}

/// Check if a path should be ignored
fn should_ignore_path(path: &Path, project_path: &str, gitignore: &Gitignore) -> bool {
    // Check if it's a directory (we want to watch for file changes only)
    if path.is_dir() {
        return true;
    }

    // Get relative path
    let relative_path = match path.strip_prefix(project_path) {
        Ok(p) => p,
        Err(_) => return true, // Ignore paths outside project
    };

    // Check against gitignore
    let is_ignored = gitignore
        .matched_path_or_any_parents(relative_path, false)
        .is_ignore();

    is_ignored
}

/// Calculate git diff for a file
fn calculate_git_diff(file_path: &Path, project_path: &str) -> Result<String> {
    let relative_path = file_path
        .strip_prefix(project_path)
        .unwrap_or(file_path)
        .to_string_lossy()
        .replace('\\', "/");

    // Try to get git diff
    let output = Command::new("git")
        .args(&["diff", "HEAD", "--", &relative_path])
        .current_dir(project_path)
        .output()
        .context("Failed to execute git diff")?;

    if output.status.success() {
        let diff = String::from_utf8_lossy(&output.stdout).to_string();

        // If no diff from HEAD, it might be a new untracked file
        if diff.trim().is_empty() {
            // Try to show the entire file as an addition
            let output = Command::new("git")
                .args(&["diff", "--no-index", "/dev/null", &relative_path])
                .current_dir(project_path)
                .output();

            if let Ok(out) = output {
                if out.status.success() {
                    return Ok(String::from_utf8_lossy(&out.stdout).to_string());
                }
            }

            // Fallback: read the file content and format as diff
            if file_path.exists() {
                let content = std::fs::read_to_string(file_path)?;
                let lines: Vec<&str> = content.lines().collect();
                let mut diff = format!("--- /dev/null\n+++ {}\n", relative_path);
                diff.push_str(&format!("@@ -0,0 +1,{} @@\n", lines.len()));
                for line in lines {
                    diff.push_str(&format!("+{}\n", line));
                }
                return Ok(diff);
            }
        }

        Ok(diff)
    } else {
        Err(anyhow::anyhow!(
            "Git diff failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_gitignore() {
        // This test would require a test project directory
        // Just ensure the function doesn't panic with a non-existent path
        let result = load_gitignore("/tmp/nonexistent");
        assert!(result.is_ok());
    }
}
