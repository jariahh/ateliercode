/**
 * Platform detection utilities
 * Detects whether the app is running as Tauri desktop or web browser
 */

/**
 * Check if running in Tauri desktop environment
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Check if running in web browser (not Tauri)
 */
export function isWeb(): boolean {
  return !isTauri();
}

/**
 * Get the current platform type
 */
export function getPlatform(): 'tauri' | 'web' {
  return isTauri() ? 'tauri' : 'web';
}

/**
 * Check if the build target is web (set at build time)
 */
export function isWebBuild(): boolean {
  return import.meta.env.VITE_BUILD_TARGET === 'web';
}
