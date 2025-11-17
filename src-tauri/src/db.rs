use anyhow::{Context, Result};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use sqlx::migrate::MigrateDatabase;
use std::path::PathBuf;
use tauri::AppHandle;

/// Database connection pool
#[derive(Clone)]
pub struct Database {
    pub pool: SqlitePool,
}

impl Database {
    /// Initialize database connection and run migrations
    pub async fn init(app: &AppHandle) -> Result<Self> {
        let db_path = get_database_path(app)?;
        let db_url = format!("sqlite:{}", db_path.to_string_lossy());

        // Create database if it doesn't exist
        if !sqlx::Sqlite::database_exists(&db_url).await? {
            log::info!("Creating database at: {}", db_path.display());
            sqlx::Sqlite::create_database(&db_url).await?;
        }

        // Create connection pool
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

        // Run migrations
        log::info!("Running database migrations...");
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .context("Failed to run migrations")?;

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
