// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod adapters;
mod agent_adapter;
mod agent_manager;
mod agents;
mod ai_service;
mod commands;
mod commands_chat;
mod commands_whisper;
mod db;
mod file_watcher;
mod models;
mod output_parser;
mod plugin;
mod plugins;
mod project_analyzer;
mod types;

use tauri::Manager;
use db::Database;
use file_watcher::FileWatcherManager;
use agent_manager::AgentManager;
use plugin::PluginManager;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to AtelierCode!", name)
}

#[tauri::command]
fn get_hostname() -> String {
    hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "Unknown".to_string())
}

#[tauri::command]
fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

fn main() {
    // Initialize logger
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_hostname,
            get_platform,
            commands::create_project,
            commands::get_projects,
            commands::get_project,
            commands::has_recent_activity,
            commands::update_project,
            commands::delete_project,
            commands::detect_agents,
            commands::select_folder,
            commands::analyze_project_directory,
            commands::analyze_project_with_ai,
            commands::update_project_with_ai,
            commands::generate_project_details,
            commands::create_task,
            commands::get_tasks,
            commands::update_task,
            commands::delete_task,
            commands::update_task_status,
            commands::read_project_files,
            commands::get_folder_children,
            commands::get_git_status,
            commands::read_file_content,
            commands::send_message,
            commands::get_messages,
            commands::get_session_messages,
            commands::get_project_messages,
            commands::count_session_messages,
            commands::save_message,
            commands::log_activity,
            commands::get_activities,
            commands::get_project_stats,
            commands::start_watching_project,
            commands::stop_watching_project,
            commands::is_watching_project,
            commands::get_pending_changes,
            commands::get_all_changes,
            commands::approve_change,
            commands::reject_change,
            commands::get_file_diff,
            commands::add_review_comment,
            commands::get_review_comments,
            commands::resolve_review_comment,
            commands::unresolve_review_comment,
            commands::delete_review_comment,
            commands::start_agent_session,
            commands::send_to_agent,
            commands::read_agent_output,
            commands::read_agent_events,
            commands::read_agent_output_and_events,
            commands::stop_agent_session,
            commands::sync_claude_session_id,
            commands::get_agent_status,
            commands::list_agent_sessions,
            commands::check_agent_health,
            commands::get_project_sessions,
            commands::cleanup_orphaned_sessions,
            // Chat tab commands
            commands::get_chat_tabs,
            commands::create_chat_tab,
            commands::update_chat_tab,
            commands::set_active_tab,
            commands::close_chat_tab,
            commands::reorder_chat_tabs,
            // Chat commands (plugin-based)
            commands_chat::get_chat_history,
            commands_chat::get_chat_history_paginated,
            commands_chat::list_cli_sessions,
            commands_chat::start_chat_session,
            commands_chat::send_chat_message,
            commands_chat::start_watching_session,
            commands_chat::stop_watching_session,
            // Whisper transcription commands
            commands_whisper::check_whisper_installation,
            commands_whisper::install_whisper,
            commands_whisper::transcribe_local,
            commands_whisper::transcribe_openai,
        ])
        .setup(|app| {
            // Initialize database
            let app_handle = app.handle();
            tauri::async_runtime::block_on(async move {
                match Database::init(&app_handle).await {
                    Ok(db) => {
                        log::info!("Database initialized successfully");
                        // Store database in app state for access in commands
                        app_handle.manage(db);
                        Ok(())
                    }
                    Err(e) => {
                        log::error!("Failed to initialize database: {}", e);
                        Err(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))
                    }
                }
            })?;

            // Initialize file watcher manager (for project changes)
            let watcher_manager = FileWatcherManager::new();
            app.manage(watcher_manager);
            log::info!("File watcher manager initialized");

            // Initialize agent manager
            let agent_manager = AgentManager::new();
            app.manage(agent_manager);
            log::info!("Agent manager initialized");

            // Initialize plugin manager
            let mut plugin_manager = PluginManager::new();

            // Discover and load plugins from default directory
            let plugin_dir = plugins::get_default_plugin_dir();
            log::info!("Loading plugins from: {:?}", plugin_dir);

            unsafe {
                match plugin_manager.discover_and_load(&plugin_dir) {
                    Ok(count) => log::info!("Loaded {} plugins", count),
                    Err(e) => log::error!("Failed to load plugins: {}", e),
                }
            }

            app.manage(plugin_manager);
            log::info!("Plugin manager initialized");

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
