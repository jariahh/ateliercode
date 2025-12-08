// Dynamic Plugin Loader
// Loads compiled plugin libraries (.so/.dll/.dylib) at runtime

use crate::plugin::AgentPlugin;
use crate::plugins::config::PluginConfig;
use anyhow::{Context, Result};
use std::path::{Path, PathBuf};

/// Plugin metadata from manifest file
#[derive(Debug, Clone)]
pub struct PluginManifest {
    pub config: PluginConfig,
    pub library_path: PathBuf,
}

/// Discovers plugins in a directory
pub fn discover_plugins(plugin_dir: &Path) -> Result<Vec<PluginManifest>> {
    let mut manifests = Vec::new();

    if !plugin_dir.exists() {
        log::warn!("Plugin directory does not exist: {:?}", plugin_dir);
        return Ok(manifests);
    }

    log::info!("Discovering plugins in: {:?}", plugin_dir);

    // Iterate through subdirectories
    for entry in std::fs::read_dir(plugin_dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            // Look for plugin.toml in each subdirectory
            let manifest_path = path.join("plugin.toml");
            if manifest_path.exists() {
                match load_plugin_manifest(&manifest_path, &path) {
                    Ok(manifest) => {
                        log::info!("Found plugin: {} at {:?}", manifest.config.plugin.name, path);
                        manifests.push(manifest);
                    }
                    Err(e) => {
                        log::error!("Failed to load plugin manifest at {:?}: {}", manifest_path, e);
                    }
                }
            }
        }
    }

    log::info!("Discovered {} plugins", manifests.len());
    Ok(manifests)
}

/// Load plugin manifest from a plugin.toml file
fn load_plugin_manifest(manifest_path: &Path, plugin_dir: &Path) -> Result<PluginManifest> {
    // Load the TOML config
    let config = PluginConfig::from_file(manifest_path)
        .context("Failed to parse plugin.toml")?;

    // Find any library file in the plugin directory
    let library_path = find_library_file(plugin_dir)
        .context("No plugin library found in directory")?;

    Ok(PluginManifest {
        config,
        library_path,
    })
}

/// Find a library file (.dll, .so, .dylib) in a directory
fn find_library_file(dir: &Path) -> Result<PathBuf> {
    let extensions = if cfg!(target_os = "windows") {
        vec!["dll"]
    } else if cfg!(target_os = "macos") {
        vec!["dylib"]
    } else {
        vec!["so"]
    };

    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_file() {
            if let Some(ext) = path.extension() {
                if extensions.contains(&ext.to_str().unwrap_or("")) {
                    log::info!("Found plugin library: {:?}", path);
                    return Ok(path);
                }
            }
        }
    }

    anyhow::bail!("No library file found with extensions: {:?}", extensions)
}

/// Get the platform-specific library filename
fn get_library_filename(name: &str) -> String {
    #[cfg(target_os = "windows")]
    {
        format!("{}.dll", name)
    }

    #[cfg(target_os = "macos")]
    {
        format!("lib{}.dylib", name)
    }

    #[cfg(target_os = "linux")]
    {
        format!("lib{}.so", name)
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        format!("lib{}.so", name)
    }
}

/// Wrapper for a dynamically loaded plugin
pub struct DynamicPlugin {
    #[allow(dead_code)]
    library: libloading::Library,
    plugin: Box<dyn AgentPlugin>,
}

impl DynamicPlugin {
    /// Load a plugin from a library file
    pub unsafe fn load(library_path: &Path) -> Result<Self> {
        log::info!("Loading plugin library: {:?}", library_path);

        // Load the dynamic library
        let library = libloading::Library::new(library_path)
            .context("Failed to load plugin library")?;

        // Get the plugin constructor function
        // Plugins must export a function: extern "C" fn create_plugin() -> *mut dyn AgentPlugin
        type PluginCreate = unsafe extern "C" fn() -> *mut dyn AgentPlugin;

        let constructor: libloading::Symbol<PluginCreate> = library
            .get(b"create_plugin")
            .context("Plugin does not export 'create_plugin' function")?;

        // Call the constructor to get the plugin instance
        let raw_plugin = constructor();

        if raw_plugin.is_null() {
            anyhow::bail!("Plugin constructor returned null");
        }

        // Convert raw pointer to Box
        let plugin = Box::from_raw(raw_plugin);

        log::info!("Plugin loaded successfully: {}", plugin.name());

        Ok(Self { library, plugin })
    }

    /// Get a reference to the plugin
    pub fn plugin(&self) -> &dyn AgentPlugin {
        self.plugin.as_ref()
    }
}

// Safety: The library and plugin are managed together
unsafe impl Send for DynamicPlugin {}
unsafe impl Sync for DynamicPlugin {}

/// Get the default plugin directory based on platform
pub fn get_default_plugin_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| "C:\\".to_string());
        PathBuf::from(appdata).join("AtelierCode").join("plugins")
    }

    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/".to_string());
        PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("AtelierCode")
            .join("plugins")
    }

    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/".to_string());
        PathBuf::from(home)
            .join(".config")
            .join("ateliercode")
            .join("plugins")
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        PathBuf::from("/etc/ateliercode/plugins")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_library_filename() {
        let name = "claude_code";

        #[cfg(target_os = "windows")]
        assert_eq!(get_library_filename(name), "claude_code.dll");

        #[cfg(target_os = "macos")]
        assert_eq!(get_library_filename(name), "libclaude_code.dylib");

        #[cfg(target_os = "linux")]
        assert_eq!(get_library_filename(name), "libclaude_code.so");
    }

    #[test]
    fn test_get_default_plugin_dir() {
        let dir = get_default_plugin_dir();
        assert!(dir.to_string_lossy().contains("AtelierCode") || dir.to_string_lossy().contains("ateliercode"));
    }
}
