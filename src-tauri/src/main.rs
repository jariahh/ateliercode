// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod agents;
mod ai_service;
mod commands;
mod db;
mod models;
mod project_analyzer;
mod types;

use tauri::Manager;
use db::Database;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to AtelierCode!", name)
}

fn main() {
    // Initialize logger
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::create_project,
            commands::get_projects,
            commands::get_project,
            commands::update_project,
            commands::delete_project,
            commands::detect_agents,
            commands::select_folder,
            commands::analyze_project_directory,
            commands::analyze_project_with_ai,
            commands::create_task,
            commands::get_tasks,
            commands::update_task,
            commands::delete_task,
            commands::update_task_status,
            commands::read_project_files,
            commands::read_file_content,
            commands::send_message,
            commands::get_messages,
            commands::log_activity,
            commands::get_activities,
            commands::get_project_stats,
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
