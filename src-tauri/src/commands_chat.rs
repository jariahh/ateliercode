// Chat-related commands for the plugin system
// Handles chat sessions, messages, and history

use crate::db::Database;
use crate::plugin::{PluginManager, SessionUpdate, WatchHandle};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

/// A message in the conversation history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String, // "user" or "assistant"
    pub content: String,
    pub timestamp: Option<i64>,
    pub metadata: Option<std::collections::HashMap<String, String>>,
}

/// Get conversation history from the CLI for a specific session
#[tauri::command]
pub async fn get_chat_history(
    plugin_manager: State<'_, PluginManager>,
    plugin_name: String,
    cli_session_id: String,
) -> Result<Vec<ChatMessage>, String> {
    log::info!(
        "Getting chat history for plugin: {}, session: {}",
        plugin_name,
        cli_session_id
    );

    // Get the plugin - if not found, return empty list (agent doesn't support chat history)
    let plugin = match plugin_manager.get(&plugin_name) {
        Some(p) => p,
        None => {
            log::info!(
                "Plugin '{}' not found - returning empty chat history (agent may not support history)",
                plugin_name
            );
            return Ok(Vec::new());
        }
    };

    // Get conversation history from the plugin
    let history = plugin
        .get_conversation_history(&cli_session_id)
        .await
        .map_err(|e| format!("Failed to get conversation history: {}", e))?;

    // Convert HistoryMessage to ChatMessage
    let messages: Vec<ChatMessage> = history
        .into_iter()
        .map(|msg| ChatMessage {
            role: msg.role,
            content: msg.content,
            timestamp: Some(msg.timestamp),
            metadata: if msg.metadata.is_empty() { None } else { Some(msg.metadata) },
        })
        .collect();

    log::info!("Retrieved {} messages from chat history", messages.len());

    Ok(messages)
}

/// Paginated history result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedChatHistory {
    pub messages: Vec<ChatMessage>,
    pub total_count: usize,
    pub has_more: bool,
    pub offset: usize,
}

/// Get paginated conversation history (most recent first)
#[tauri::command]
pub async fn get_chat_history_paginated(
    plugin_manager: State<'_, PluginManager>,
    plugin_name: String,
    cli_session_id: String,
    offset: usize,
    limit: usize,
) -> Result<PaginatedChatHistory, String> {
    log::info!(
        "Getting paginated chat history for plugin: {}, session: {}, offset: {}, limit: {}",
        plugin_name,
        cli_session_id,
        offset,
        limit
    );

    // Get the plugin - if not found, return empty result (agent doesn't support chat history)
    let plugin = match plugin_manager.get(&plugin_name) {
        Some(p) => p,
        None => {
            log::info!(
                "Plugin '{}' not found - returning empty paginated history (agent may not support history)",
                plugin_name
            );
            return Ok(PaginatedChatHistory {
                messages: Vec::new(),
                total_count: 0,
                has_more: false,
                offset,
            });
        }
    };

    // Get paginated conversation history from the plugin
    let history = plugin
        .get_conversation_history_paginated(&cli_session_id, offset, limit)
        .await
        .map_err(|e| format!("Failed to get paginated conversation history: {}", e))?;

    // Convert HistoryMessage to ChatMessage
    let messages: Vec<ChatMessage> = history
        .messages
        .into_iter()
        .map(|msg| ChatMessage {
            role: msg.role,
            content: msg.content,
            timestamp: Some(msg.timestamp),
            metadata: if msg.metadata.is_empty() { None } else { Some(msg.metadata) },
        })
        .collect();

    log::info!(
        "Retrieved {} messages (total: {}, has_more: {})",
        messages.len(),
        history.total_count,
        history.has_more
    );

    Ok(PaginatedChatHistory {
        messages,
        total_count: history.total_count,
        has_more: history.has_more,
        offset: history.offset,
    })
}

/// List available CLI sessions for a plugin
#[tauri::command]
pub async fn list_cli_sessions(
    plugin_manager: State<'_, PluginManager>,
    plugin_name: String,
    project_path: String,
) -> Result<Vec<SessionListItem>, String> {
    log::info!(
        "Listing CLI sessions for plugin: {} in project: {}",
        plugin_name,
        project_path
    );
    eprintln!("[list_cli_sessions] Called with plugin_name={}, project_path={}", plugin_name, project_path);

    // Get the plugin - if not found, return empty list (agent doesn't support session history)
    let plugin = match plugin_manager.get(&plugin_name) {
        Some(p) => {
            eprintln!("[list_cli_sessions] Found plugin: {}", p.name());
            p
        },
        None => {
            log::info!(
                "Plugin '{}' not found - returning empty session list (agent may not support session history)",
                plugin_name
            );
            eprintln!("[list_cli_sessions] Plugin '{}' NOT FOUND", plugin_name);
            return Ok(Vec::new());
        }
    };

    // List sessions from the plugin
    eprintln!("[list_cli_sessions] Calling plugin.list_sessions...");
    let sessions = plugin
        .list_sessions(&project_path)
        .await
        .map_err(|e| {
            eprintln!("[list_cli_sessions] Error calling list_sessions: {}", e);
            format!("Failed to list sessions: {}", e)
        })?;
    eprintln!("[list_cli_sessions] plugin.list_sessions returned {} sessions", sessions.len());

    // Convert SessionInfo to SessionListItem
    let items: Vec<SessionListItem> = sessions
        .into_iter()
        .map(|session| SessionListItem {
            session_id: session.cli_session_id,
            created_at: session.started_at,
            last_message_preview: session.metadata.get("last_message").cloned(),
            message_count: session.message_count,
        })
        .collect();

    log::info!("Found {} CLI sessions", items.len());

    Ok(items)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionListItem {
    pub session_id: String,
    pub created_at: i64,
    pub last_message_preview: Option<String>,
    pub message_count: usize,
}

/// Start a new chat session using a plugin
#[tauri::command]
pub async fn start_chat_session(
    db: State<'_, Database>,
    plugin_manager: State<'_, PluginManager>,
    project_id: String,
    plugin_name: String,
) -> Result<ChatSessionInfo, String> {
    log::info!(
        "Starting chat session for project: {} with plugin: {}",
        project_id,
        plugin_name
    );

    // Get the project to get the root path
    #[derive(sqlx::FromRow)]
    struct ProjectPath {
        root_path: String,
    }

    let project: ProjectPath = sqlx::query_as(
        "SELECT root_path FROM projects WHERE id = ?"
    )
    .bind(&project_id)
    .fetch_one(&db.pool)
    .await
    .map_err(|e| format!("Failed to get project: {}", e))?;

    // Get the plugin
    let plugin = plugin_manager
        .get(&plugin_name)
        .ok_or_else(|| format!("Plugin not found: {}", plugin_name))?;

    // Start the session through the plugin with project path and empty settings
    let settings = std::collections::HashMap::new();
    let handle = plugin
        .start_session(&project.root_path, &settings)
        .await
        .map_err(|e| format!("Failed to start session: {}", e))?;

    log::info!(
        "Started chat session: {} with CLI session: {:?}",
        handle.session_id,
        handle.cli_session_id
    );

    Ok(ChatSessionInfo {
        session_id: handle.session_id.clone(),
        cli_session_id: handle.cli_session_id.unwrap_or_else(|| handle.session_id.clone()),
        plugin_name,
        project_id,
        created_at: chrono::Utc::now().timestamp(),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatSessionInfo {
    pub session_id: String,
    pub cli_session_id: String,
    pub plugin_name: String,
    pub project_id: String,
    pub created_at: i64,
}

/// Send a message in a chat session
#[tauri::command]
pub async fn send_chat_message(
    plugin_manager: State<'_, PluginManager>,
    session_id: String,
    plugin_name: String,
    cli_session_id: String,
    _project_path: String,
    message: String,
) -> Result<(), String> {
    log::info!(
        "Sending message in session: {} (CLI: {})",
        session_id,
        cli_session_id
    );

    // Get the plugin
    let plugin = plugin_manager
        .get(&plugin_name)
        .ok_or_else(|| format!("Plugin not found: {}", plugin_name))?;

    // Create session handle with correct structure
    let handle = crate::plugin::SessionHandle {
        session_id: session_id.clone(),
        cli_session_id: Some(cli_session_id.clone()),
        process_id: None,
        plugin_name: plugin_name.clone(),
        started_at: chrono::Utc::now().timestamp(),
    };

    // Send the message through the plugin
    plugin
        .send_message(&handle, &message)
        .await
        .map_err(|e| format!("Failed to send message: {}", e))?;

    log::info!("Message sent successfully");

    Ok(())
}

/// Start watching a session for real-time updates
#[tauri::command]
pub async fn start_watching_session(
    app: AppHandle,
    plugin_manager: State<'_, PluginManager>,
    plugin_name: String,
    project_path: String,
    cli_session_id: String,
) -> Result<String, String> {
    println!(
        "[TAURI] Starting to watch session: {} for plugin: {} in project: {}",
        cli_session_id,
        plugin_name,
        project_path
    );

    // Get the plugin - if not found, return empty watch_id (agent doesn't support session watching)
    let plugin = match plugin_manager.get(&plugin_name) {
        Some(p) => p,
        None => {
            log::info!(
                "Plugin '{}' not found - session watching not supported for this agent",
                plugin_name
            );
            return Ok(String::new()); // Empty watch_id indicates no watching
        }
    };

    // Clone for use in the closure
    let cli_session_id_for_callback = cli_session_id.clone();

    // Create a callback that emits Tauri events
    let callback = Box::new(move |update: SessionUpdate| {
        println!("[TAURI] Session update received: {:?}", update);

        // Emit the event to the frontend
        if let Err(e) = app.emit("session-update", serde_json::json!({
            "cli_session_id": &cli_session_id_for_callback,
            "update": update
        })) {
            println!("[TAURI] Failed to emit session-update event: {}", e);
        } else {
            println!("[TAURI] Successfully emitted session-update event");
        }
    });

    // Start watching the session
    let watch_handle = plugin
        .start_watching_session(&project_path, &cli_session_id, callback)
        .await
        .map_err(|e| format!("Failed to start watching session: {}", e))?;

    let watch_id = watch_handle.id.clone();
    println!("[TAURI] Started watching session with watch_id: {}", watch_id);

    Ok(watch_id)
}

/// Stop watching a session
#[tauri::command]
pub async fn stop_watching_session(
    plugin_manager: State<'_, PluginManager>,
    plugin_name: String,
    watch_id: String,
    cli_session_id: String,
) -> Result<(), String> {
    log::info!(
        "Stopping watch for session: {} (watch_id: {})",
        cli_session_id,
        watch_id
    );

    // If watch_id is empty, nothing to stop (agent doesn't support session watching)
    if watch_id.is_empty() {
        log::info!("Empty watch_id - nothing to stop");
        return Ok(());
    }

    // Get the plugin - if not found, silently succeed (nothing to stop)
    let plugin = match plugin_manager.get(&plugin_name) {
        Some(p) => p,
        None => {
            log::info!(
                "Plugin '{}' not found - nothing to stop",
                plugin_name
            );
            return Ok(());
        }
    };

    // Create the watch handle
    let watch_handle = WatchHandle {
        id: watch_id.clone(),
        plugin_name: plugin_name.clone(),
        cli_session_id: cli_session_id.clone(),
    };

    // Stop watching the session
    plugin
        .stop_watching_session(watch_handle)
        .await
        .map_err(|e| format!("Failed to stop watching session: {}", e))?;

    log::info!("Successfully stopped watching session");

    Ok(())
}
