/**
 * Agent Display Utilities
 *
 * Provides centralized color/icon mapping for agents.
 * Uses plugin-provided values when available, with fallback defaults.
 */

// Color name to Tailwind class mapping
const colorToTailwind: Record<string, { text: string; bg: string; border: string }> = {
  purple: {
    text: 'text-purple-400',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500',
  },
  blue: {
    text: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500',
  },
  green: {
    text: 'text-green-400',
    bg: 'bg-green-500/20',
    border: 'border-green-500',
  },
  orange: {
    text: 'text-orange-400',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500',
  },
  red: {
    text: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500',
  },
  yellow: {
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500',
  },
  cyan: {
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500',
  },
  pink: {
    text: 'text-pink-400',
    bg: 'bg-pink-500/20',
    border: 'border-pink-500',
  },
  indigo: {
    text: 'text-indigo-400',
    bg: 'bg-indigo-500/20',
    border: 'border-indigo-500',
  },
  teal: {
    text: 'text-teal-400',
    bg: 'bg-teal-500/20',
    border: 'border-teal-500',
  },
};

// Default fallback config
const defaultConfig = {
  icon: '⚪',
  text: 'text-base-content',
  bg: 'bg-base-300',
  border: 'border-base-content',
};

export interface AgentDisplayConfig {
  icon: string;
  text: string;
  bg: string;
  border: string;
}

/**
 * Get display configuration for an agent
 *
 * @param icon - Plugin-provided icon (emoji)
 * @param color - Plugin-provided color name (e.g., "purple", "blue")
 * @returns Display configuration with Tailwind classes
 */
export function getAgentDisplayConfig(icon?: string, color?: string): AgentDisplayConfig {
  const colorConfig = color ? colorToTailwind[color.toLowerCase()] : undefined;

  return {
    icon: icon || defaultConfig.icon,
    text: colorConfig?.text || defaultConfig.text,
    bg: colorConfig?.bg || defaultConfig.bg,
    border: colorConfig?.border || defaultConfig.border,
  };
}

/**
 * Get the display name for an agent
 * Uses plugin-provided display_name if available, otherwise normalizes the name
 *
 * @param name - Agent name
 * @param displayName - Plugin-provided display name
 */
export function getAgentDisplayName(name: string, displayName?: string): string {
  if (displayName) return displayName;

  // Fallback display name normalization
  const nameMap: Record<string, string> = {
    'claude-code': 'Claude',
    'claude code': 'Claude',
    'github copilot': 'Copilot',
    'gh copilot': 'Copilot',
  };

  const normalizedName = name.toLowerCase();
  return nameMap[normalizedName] || name;
}
