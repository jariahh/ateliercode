// Plugin Settings API
import { invoke } from '@tauri-apps/api/core';
import { peerConnection } from '../services/peerConnection';

// Helper to check if we should use WebRTC
function useWebRTC(): boolean {
  return peerConnection.isClient;
}

// Types
export interface FlagOption {
  value: string;
  label: string;
  description: string;
}

export type FlagType = 'toggle' | 'select' | 'string';

export interface PluginFlag {
  id: string;
  flag: string;
  label: string;
  description: string;
  flag_type: FlagType;
  default_value: string;
  options: FlagOption[];
  category: string;
}

export interface PluginSettings {
  flags: Record<string, string>;
}

export interface AllPluginSettings {
  plugins: Record<string, PluginSettings>;
}

/**
 * Get settings for a specific plugin
 */
export async function getPluginSettings(pluginName: string): Promise<PluginSettings> {
  if (useWebRTC()) {
    return peerConnection.sendCommand<PluginSettings>('get_plugin_settings', { pluginName });
  }
  return await invoke<PluginSettings>('get_plugin_settings', { pluginName });
}

/**
 * Get a specific flag value
 */
export async function getPluginFlagValue(pluginName: string, flagId: string): Promise<string | null> {
  if (useWebRTC()) {
    return peerConnection.sendCommand<string | null>('get_plugin_flag_value', { pluginName, flagId });
  }
  return await invoke<string | null>('get_plugin_flag_value', { pluginName, flagId });
}

/**
 * Set a specific flag value
 */
export async function setPluginFlagValue(pluginName: string, flagId: string, value: string): Promise<void> {
  if (useWebRTC()) {
    return peerConnection.sendCommand<void>('set_plugin_flag_value', { pluginName, flagId, value });
  }
  return await invoke<void>('set_plugin_flag_value', { pluginName, flagId, value });
}

/**
 * Set multiple flag values for a plugin
 */
export async function setPluginSettings(pluginName: string, flags: Record<string, string>): Promise<void> {
  if (useWebRTC()) {
    return peerConnection.sendCommand<void>('set_plugin_settings', { pluginName, flags });
  }
  return await invoke<void>('set_plugin_settings', { pluginName, flags });
}

/**
 * Get all plugin settings
 */
export async function getAllPluginSettings(): Promise<AllPluginSettings> {
  if (useWebRTC()) {
    return peerConnection.sendCommand<AllPluginSettings>('get_all_plugin_settings');
  }
  return await invoke<AllPluginSettings>('get_all_plugin_settings');
}
