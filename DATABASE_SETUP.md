# AtelierCode - Database Setup

## Overview

The database foundation for AtelierCode has been successfully created using SQLite with sqlx for async database operations and migrations.

## Files Created

### 1. Migration Schema
**Location:** `C:\projects\ateliercode\src-tauri\migrations\001_initial_schema.sql`

Contains the complete database schema with 8 tables:
- `projects` - Core project information
- `tasks` - Project tasks and subtasks
- `chat_messages` - Chat history with AI agents
- `agent_sessions` - Agent execution sessions
- `activity_log` - Activity tracking
- `file_changes` - File modification tracking
- `review_comments` - Code review comments
- `settings` - Application settings

Includes 8 performance indexes for optimized queries.

### 2. Database Module
**Location:** `C:\projects\ateliercode\src-tauri\src\db.rs`

Features:
- Automatic database creation in platform-specific AppData directory
- Connection pooling (max 5 connections)
- Foreign key constraint enforcement
- Automatic migration runner on app startup
- Proper error handling with anyhow

Database locations by platform:
- **Windows:** `%APPDATA%\com.ateliercode.app\ateliercode.db`
- **macOS:** `~/Library/Application Support/com.ateliercode.app/ateliercode.db`
- **Linux:** `~/.local/share/com.ateliercode.app/ateliercode.db`

### 3. Models Module
**Location:** `C:\projects\ateliercode\src-tauri\src\models.rs`

Rust structs matching the database schema:
- `Project` - With `new()` constructor
- `Task` - With `new()` constructor
- `ChatMessage` - With `new()` constructor
- `AgentSession` - With `new()` constructor
- `ActivityLog` - With `new()` constructor
- `FileChange` - With `new()` constructor
- `ReviewComment` - With `new()` constructor
- `Setting` - With `new()` constructor

All models include:
- Serde serialization/deserialization
- sqlx `FromRow` trait for database queries
- UUIDs for primary keys
- Timestamp management with chrono

### 4. Updated Cargo.toml
**Location:** `C:\projects\ateliercode\src-tauri\Cargo.toml`

Added dependencies:
- `sqlx` with features: `["runtime-tokio-native-tls", "sqlite", "migrate"]`
- `uuid` with features: `["v4", "serde"]`
- `chrono` for timestamp handling
- `log` for logging
- `env_logger` for log output

### 5. Updated main.rs
**Location:** `C:\projects\ateliercode\src-tauri\src\main.rs`

Changes:
- Imports `db` and `models` modules
- Initializes `env_logger` for logging
- Database initialization in app setup
- Database stored in Tauri's managed state for access in commands

## Usage Examples

### Accessing Database in Tauri Commands

```rust
use tauri::State;
use crate::db::Database;
use crate::models::Project;

#[tauri::command]
async fn create_project(
    db: State<'_, Database>,
    name: String,
    root_path: String,
    agent_type: String,
) -> Result<Project, String> {
    let project = Project::new(name, root_path, agent_type);

    sqlx::query!(
        r#"
        INSERT INTO projects (id, name, root_path, agent_type, status, created_at, last_activity)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
        project.id,
        project.name,
        project.root_path,
        project.agent_type,
        project.status,
        project.created_at,
        project.last_activity
    )
    .execute(db.pool())
    .await
    .map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
async fn get_all_projects(db: State<'_, Database>) -> Result<Vec<Project>, String> {
    let projects = sqlx::query_as!(
        Project,
        "SELECT * FROM projects ORDER BY last_activity DESC"
    )
    .fetch_all(db.pool())
    .await
    .map_err(|e| e.to_string())?;

    Ok(projects)
}
```

### Register Commands in main.rs

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            create_project,
            get_all_projects
        ])
        // ... rest of setup
}
```

## Building and Running

1. **Install Dependencies:**
   ```bash
   cd src-tauri
   cargo build
   ```

2. **Run Migrations (automatic on first run):**
   The migrations will run automatically when the app starts.

3. **Development Mode:**
   ```bash
   npm run tauri dev
   ```

4. **Production Build:**
   ```bash
   npm run tauri build
   ```

## Database Management

### Manual Migration Testing

If you need to test migrations manually:

```bash
cd src-tauri
# Install sqlx-cli
cargo install sqlx-cli --no-default-features --features sqlite

# Run migrations
sqlx migrate run --database-url sqlite:./test.db
```

### Adding New Migrations

Create new migration files in `src-tauri/migrations/`:
```
002_add_new_feature.sql
003_update_schema.sql
```

Migrations are run in order automatically on app startup.

## Error Handling

The database module uses `anyhow` for error handling with proper context:
- Database creation errors
- Connection pool errors
- Migration errors
- Query errors

All errors are logged using the `log` crate and can be viewed with `RUST_LOG=info` environment variable.

## Next Steps

1. **Create Database Commands**: Add Tauri commands for CRUD operations
2. **Add Queries**: Create helper functions for common queries
3. **Testing**: Write integration tests for database operations
4. **Optimization**: Add caching layer if needed for frequent queries

## Notes

- Foreign keys are enabled by default
- Connection pool is limited to 5 concurrent connections
- All timestamps are stored as Unix timestamps (i64)
- JSON fields use TEXT with manual serialization/deserialization
- UUIDs are stored as TEXT (36 characters)

---

**Database setup completed successfully!**
