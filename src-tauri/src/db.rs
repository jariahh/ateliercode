use anyhow::{Context, Result};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// Embed migrations using Refinery
mod embedded {
    use refinery::embed_migrations;
    embed_migrations!("migrations");
}

/// Database connection pool
#[derive(Clone)]
pub struct Database {
    pub pool: SqlitePool,
}

impl Database {
    /// Initialize database connection and run migrations
    pub async fn init(app: &AppHandle) -> Result<Self> {
        let db_path = get_database_path(app)?;

        log::info!("Initializing database at: {}", db_path.display());

        // Ensure directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .context("Failed to create database directory")?;
        }

        // Run migrations first using Refinery with rusqlite
        log::info!("Running database migrations with Refinery...");
        let mut conn = rusqlite::Connection::open(&db_path)
            .context("Failed to open database for migrations")?;

        match embedded::migrations::runner().run(&mut conn) {
            Ok(report) => {
                log::info!("Migrations applied successfully. Applied migrations: {:?}", report.applied_migrations());
            }
            Err(e) => {
                log::error!("Migration failed: {:?}", e);
                return Err(anyhow::anyhow!("Failed to run migrations: {}", e));
            }
        }

        // Close rusqlite connection
        drop(conn);

        log::info!("Migrations completed successfully");

        // Create SQLx connection pool
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(
                SqliteConnectOptions::new()
                    .filename(&db_path)
                    .create_if_missing(true)
                    .foreign_keys(true), // Enable foreign key constraints
            )
            .await
            .context("Failed to connect to database")?;

        log::info!("Database initialized successfully");

        Ok(Self { pool })
    }

    /// Get a reference to the connection pool
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}

/// Get the database file path based on the platform
fn get_database_path(app: &AppHandle) -> Result<PathBuf> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .context("Failed to get app data directory")?;

    // Ensure the directory exists
    std::fs::create_dir_all(&app_data_dir)
        .context("Failed to create app data directory")?;

    let db_path = app_data_dir.join("ateliercode.db");
    Ok(db_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_database_creation() {
        // Test would require a Tauri app instance
        // This is a placeholder for integration tests
    }
}
