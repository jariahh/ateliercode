import { useEffect, useState } from 'react';
import { Bot, Check, AlertCircle } from 'lucide-react';
import type { AgentType, AgentInfo } from '../types/project';
import * as tauriApi from '../lib/tauri';

interface AgentOption {
  type: AgentType;
  name: string;
  description: string;
  icon: string;
  installed: boolean;
  recommended?: boolean;
}

interface AgentSelectorProps {
  value: AgentType | null;
  onChange: (agent: AgentType) => void;
  error?: string;
}

// Static agent metadata
const agentMetadata: Record<string, { displayName: string; description: string; icon: string; recommended?: boolean }> = {
  'claude-code': {
    displayName: 'Claude Code',
    description: 'Official Anthropic CLI for Claude. Best for complex coding tasks.',
    icon: '🤖',
    recommended: true,
  },
  'aider': {
    displayName: 'Aider',
    description: 'AI pair programming in your terminal. Great for Git workflows.',
    icon: '🎯',
  },
  'github-copilot': {
    displayName: 'GitHub Copilot',
    description: 'GitHub\'s AI assistant. Excellent for code completion.',
    icon: '🐙',
  },
  'cursor': {
    displayName: 'Cursor',
    description: 'AI-first code editor with chat and inline editing.',
    icon: '✨',
  },
};

export default function AgentSelector({ value, onChange, error }: AgentSelectorProps) {
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [isDetecting, setIsDetecting] = useState(true);

  // Detect installed agents on mount
  useEffect(() => {
    const detectInstalledAgents = async () => {
      setIsDetecting(true);

      try {
        const detectedAgents = await tauriApi.detectAgents();

        // Map detected agents to AgentOption format
        const agentOptions: AgentOption[] = detectedAgents.map((agent) => {
          const metadata = agentMetadata[agent.name] || {
            displayName: agent.name,
            description: `Command: ${agent.command}`,
            icon: '🔧',
          };

          return {
            type: agent.name as AgentType,
            // Prefer display_name from plugin, fallback to metadata
            name: agent.display_name || metadata.displayName,
            // Prefer description from plugin, fallback to metadata
            description: agent.description || metadata.description,
            icon: metadata.icon,
            installed: agent.installed,
            recommended: metadata.recommended,
          };
        });

        setAgents(agentOptions);
      } catch (err) {
        console.error('Failed to detect agents:', err);

        // Fallback: use default agents with unknown install status
        const fallbackAgents: AgentOption[] = Object.entries(agentMetadata).map(([type, meta]) => ({
          type: type as AgentType,
          name: meta.displayName,
          description: meta.description,
          icon: meta.icon,
          installed: false,
          recommended: meta.recommended,
        }));

        setAgents(fallbackAgents);
      } finally {
        setIsDetecting(false);
      }
    };

    detectInstalledAgents();
  }, []);
  return (
    <div className="form-control w-full">
      <label className="label">
        <span className="label-text font-medium">
          Select AI Agent
          <span className="text-error ml-1">*</span>
        </span>
        {isDetecting && (
          <span className="label-text-alt">
            <span className="loading loading-spinner loading-sm mr-1"></span>
            Detecting agents...
          </span>
        )}
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.type}
            onClick={() => onChange(agent.type)}
            className={`
              card bg-base-200 cursor-pointer transition-all duration-200
              hover:shadow-lg hover:scale-[1.02] relative
              ${value === agent.type ? 'ring-2 ring-primary shadow-lg' : ''}
              ${!agent.installed ? 'opacity-75' : ''}
            `}
          >
            <div className="card-body p-4">
              {/* Selected Indicator */}
              {value === agent.type && (
                <div className="absolute top-2 right-2">
                  <div className="badge badge-primary">
                    <Check className="w-3 h-3 mr-1" />
                    Selected
                  </div>
                </div>
              )}

              {/* Recommended Badge */}
              {agent.recommended && (
                <div className="absolute top-2 left-2">
                  <div className="badge badge-success">Recommended</div>
                </div>
              )}

              {/* Agent Icon and Name */}
              <div className="flex items-start gap-3 mt-2">
                <div className="text-4xl">{agent.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{agent.name}</h3>
                    {agent.installed ? (
                      <div className="badge badge-success badge-sm">Installed</div>
                    ) : (
                      <div className="badge badge-warning badge-sm">Not Installed</div>
                    )}
                  </div>
                  <p className="text-sm text-base-content/70 mt-1">
                    {agent.description}
                  </p>
                </div>
              </div>

              {/* Installation Warning */}
              {!agent.installed && (
                <div className="alert alert-warning mt-3 py-2 px-3">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">
                    This agent needs to be installed before use
                  </span>
                </div>
              )}

              {/* Radio Input (Hidden but accessible) */}
              <input
                type="radio"
                name="agent"
                value={agent.type}
                checked={value === agent.type}
                onChange={() => onChange(agent.type)}
                className="hidden"
                aria-label={`Select ${agent.name}`}
              />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}

      <label className="label">
        <span className="label-text-alt text-base-content/60">
          Choose an AI agent to assist with your project
        </span>
      </label>
    </div>
  );
}
