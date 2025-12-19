// Plugin Settings Storage
// Handles saving and loading plugin flag configurations

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::RwLock;

/// Plugin settings for a specific plugin
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginSettings {
    /// Flag values keyed by flag ID
    pub flags: HashMap<String, String>,
}

/// All plugin settings
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AllPluginSettings {
    /// Settings keyed by plugin name
    pub plugins: HashMap<String, PluginSettings>,
}

/// Plugin settings manager
pub struct PluginSettingsManager {
    settings_path: PathBuf,
    settings: RwLock<AllPluginSettings>,
}

impl PluginSettingsManager {
    /// Create a new settings manager
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        let settings_path = app_data_dir.join("plugin_settings.json");

        // Load existing settings or create default
        let settings = if settings_path.exists() {
            let content = std::fs::read_to_string(&settings_path)
                .context("Failed to read plugin settings file")?;
            serde_json::from_str(&content)
                .context("Failed to parse plugin settings")?
        } else {
            AllPluginSettings::default()
        };

        Ok(Self {
            settings_path,
            settings: RwLock::new(settings),
        })
    }

    /// Save settings to disk
    fn save(&self) -> Result<()> {
        let settings = self.settings.read().unwrap();
        let content = serde_json::to_string_pretty(&*settings)
            .context("Failed to serialize plugin settings")?;
        std::fs::write(&self.settings_path, content)
            .context("Failed to write plugin settings file")?;
        Ok(())
    }

    /// Get all settings for a plugin
    pub fn get_plugin_settings(&self, plugin_name: &str) -> PluginSettings {
        let settings = self.settings.read().unwrap();
        settings.plugins.get(plugin_name).cloned().unwrap_or_default()
    }

    /// Get a specific flag value for a plugin
    pub fn get_flag_value(&self, plugin_name: &str, flag_id: &str) -> Option<String> {
        let settings = self.settings.read().unwrap();
        settings.plugins
            .get(plugin_name)
            .and_then(|p| p.flags.get(flag_id))
            .cloned()
    }

    /// Set a flag value for a plugin
    pub fn set_flag_value(&self, plugin_name: &str, flag_id: &str, value: String) -> Result<()> {
        {
            let mut settings = self.settings.write().unwrap();
            let plugin_settings = settings.plugins
                .entry(plugin_name.to_string())
                .or_insert_with(PluginSettings::default);
            plugin_settings.flags.insert(flag_id.to_string(), value);
        }
        self.save()
    }

    /// Set multiple flag values for a plugin
    pub fn set_plugin_settings(&self, plugin_name: &str, flags: HashMap<String, String>) -> Result<()> {
        {
            let mut settings = self.settings.write().unwrap();
            let plugin_settings = settings.plugins
                .entry(plugin_name.to_string())
                .or_insert_with(PluginSettings::default);
            plugin_settings.flags = flags;
        }
        self.save()
    }

    /// Get all plugin settings
    pub fn get_all_settings(&self) -> AllPluginSettings {
        self.settings.read().unwrap().clone()
    }
}

// ============================================================================
// Tauri Commands
// ============================================================================

use tauri::State;

/// Get settings for a specific plugin
#[tauri::command]
pub fn get_plugin_settings(
    settings_manager: State<'_, PluginSettingsManager>,
    plugin_name: String,
) -> Result<PluginSettings, String> {
    Ok(settings_manager.get_plugin_settings(&plugin_name))
}

/// Get a specific flag value
#[tauri::command]
pub fn get_plugin_flag_value(
    settings_manager: State<'_, PluginSettingsManager>,
    plugin_name: String,
    flag_id: String,
) -> Result<Option<String>, String> {
    Ok(settings_manager.get_flag_value(&plugin_name, &flag_id))
}

/// Set a specific flag value
#[tauri::command]
pub fn set_plugin_flag_value(
    settings_manager: State<'_, PluginSettingsManager>,
    plugin_name: String,
    flag_id: String,
    value: String,
) -> Result<(), String> {
    settings_manager.set_flag_value(&plugin_name, &flag_id, value)
        .map_err(|e| e.to_string())
}

/// Set multiple flag values for a plugin
#[tauri::command]
pub fn set_plugin_settings(
    settings_manager: State<'_, PluginSettingsManager>,
    plugin_name: String,
    flags: HashMap<String, String>,
) -> Result<(), String> {
    settings_manager.set_plugin_settings(&plugin_name, flags)
        .map_err(|e| e.to_string())
}

/// Get all plugin settings
#[tauri::command]
pub fn get_all_plugin_settings(
    settings_manager: State<'_, PluginSettingsManager>,
) -> Result<AllPluginSettings, String> {
    Ok(settings_manager.get_all_settings())
}
