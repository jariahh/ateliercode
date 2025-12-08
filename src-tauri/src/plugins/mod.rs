// Plugin implementations module
pub mod config;
pub mod generic_cli;
pub mod loader;

pub use config::PluginConfig;
pub use generic_cli::GenericCliPlugin;
pub use loader::{discover_plugins, get_default_plugin_dir, DynamicPlugin, PluginManifest};
