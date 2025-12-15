/**
 * Platform detection utilities
 * Detects whether the app is running as Tauri desktop or web browser
 */

/**
 * Check if running in Tauri desktop environment
 * Supports both Tauri v1 (__TAURI__) and Tauri v2 (__TAURI_INTERNALS__)
 */
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  // Tauri v2 uses __TAURI_INTERNALS__
  if ('__TAURI_INTERNALS__' in window) return true;
  // Tauri v1 uses __TAURI__
  if ('__TAURI__' in window) return true;
  return false;
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
