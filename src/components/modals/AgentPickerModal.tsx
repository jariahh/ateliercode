/**
 * AgentPickerModal - Modal for selecting an agent when creating a new chat tab
 */

import { useState, useEffect } from 'react';
import { X, Bot, Sparkles } from 'lucide-react';
import * as agentApi from '../../api/agents';
import type { DetectedAgent } from '../../api/agents';
import { getAgentDisplayConfig } from '../../lib/agentDisplay';

// Get display config for an agent using plugin-provided values
function getAgentDisplay(agent: DetectedAgent) {
  const config = getAgentDisplayConfig(agent.icon, agent.color);
  return {
    icon: config.icon,
    border: config.border,
    description: agent.description || `${agent.name} AI assistant`,
  };
}

interface AgentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (agentType: string) => void;
  defaultAgent?: string;
}

export default function AgentPickerModal({
  isOpen,
  onClose,
  onSelect,
  defaultAgent,
}: AgentPickerModalProps) {
  const [agents, setAgents] = useState<DetectedAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(defaultAgent || null);

  useEffect(() => {
    if (isOpen) {
      loadAgents();
    }
  }, [isOpen]);

  const loadAgents = async () => {
    setIsLoading(true);
    try {
      const detected = await agentApi.detectAgents();
      setAgents(detected);

      // Auto-select default agent if available, otherwise first available
      if (defaultAgent && detected.some(a => a.name.toLowerCase().includes(defaultAgent.toLowerCase()) && a.available)) {
        setSelectedAgent(defaultAgent);
      } else {
        const firstAvailable = detected.find(a => a.available);
        if (firstAvailable) {
          setSelectedAgent(firstAvailable.name);
        }
      }
    } catch (error) {
      console.error('Failed to detect agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = () => {
    if (selectedAgent) {
      onSelect(selectedAgent);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          Select Agent
        </h3>

        <p className="text-sm text-base-content/70 mb-4">
          Choose an AI agent to start a new chat session.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => {
              const display = getAgentDisplay(agent);
              const isSelected = selectedAgent === agent.name;

              return (
                <button
                  key={agent.name}
                  className={`
                    w-full p-3 rounded-lg border-2 text-left transition-all
                    ${agent.available ? 'cursor-pointer hover:bg-base-200' : 'opacity-50 cursor-not-allowed'}
                    ${isSelected ? `${display.border} bg-base-200` : 'border-base-300'}
                  `}
                  onClick={() => agent.available && setSelectedAgent(agent.name)}
                  disabled={!agent.available}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{display.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{agent.name}</span>
                        {agent.version && (
                          <span className="text-xs text-base-content/50">{agent.version}</span>
                        )}
                        {!agent.available && (
                          <span className="badge badge-sm badge-error">Not installed</span>
                        )}
                      </div>
                      <p className="text-xs text-base-content/60 mt-0.5">
                        {display.description}
                      </p>
                    </div>
                    {isSelected && agent.available && (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-primary-content text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            {agents.length === 0 && (
              <div className="text-center py-8 text-base-content/60">
                <Bot className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No agents detected</p>
                <p className="text-xs mt-1">Install Claude Code, Aider, or another AI CLI tool</p>
              </div>
            )}
          </div>
        )}

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSelect}
            disabled={!selectedAgent || !agents.find(a => a.name === selectedAgent)?.available}
          >
            Start Chat
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
    </div>
  );
}
