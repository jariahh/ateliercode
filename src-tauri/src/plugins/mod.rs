// Plugin implementations module
pub mod config;
pub mod generic_cli;
pub mod loader;

pub use generic_cli::GenericCliPlugin;
pub use loader::{discover_plugins, get_default_plugin_dir};
