/**
 * ChatTabBar - Tab bar for multi-agent chat support
 * Shows tabs for different agents/sessions in a project
 */

import { useState, useRef, useEffect } from 'react';
import { X, Plus, Edit2, Check, ChevronDown } from 'lucide-react';
import type { ChatTab } from '../../api/chatTabs';
import type { DetectedAgent } from '../../api/agents';
import { detectAgents } from '../../api/agents';
import { getAgentDisplayConfig, getAgentDisplayName } from '../../lib/agentDisplay';
import { useChatTabStore } from '../../stores/chatTabStore';
import { useSessionStore } from '../../stores/sessionStore';

interface ChatTabBarProps {
  tabs: ChatTab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onAddTab: () => void;
  onAddTabWithAgent?: (agentType: string) => void;
  onRenameTab: (tabId: string, newLabel: string) => void;
  /** Map of agent names to their display info (from detectAgents) */
  agents?: DetectedAgent[];
}

// Helper to find agent info by type
function findAgentInfo(agents: DetectedAgent[] | undefined, agentType: string): DetectedAgent | undefined {
  if (!agents) return undefined;
  const normalizedType = agentType.toLowerCase().replace(/\s+/g, '-');
  return agents.find(a => {
    const normalizedName = a.name.toLowerCase().replace(/\s+/g, '-');
    return normalizedName === normalizedType || normalizedName.includes(normalizedType) || normalizedType.includes(normalizedName);
  });
}

export default function ChatTabBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onAddTab,
  onAddTabWithAgent,
  onRenameTab,
  agents,
}: ChatTabBarProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<DetectedAgent[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  // Track which tabs have activity
  const tabsWithActivity = useChatTabStore((state) => state.tabsWithActivity);

  // Get sessions to check which tabs have actively running sessions
  const sessionsByTab = useSessionStore((state) => state.sessionsByTab);

  // Load available agents on mount (needed for tab icons) and when dropdown opens
  useEffect(() => {
    if (availableAgents.length === 0) {
      detectAgents()
        .then(setAvailableAgents)
        .catch(err => console.error('Failed to load agents:', err));
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Check if click is inside the button container OR the dropdown menu
      const isInsideButton = dropdownRef.current && dropdownRef.current.contains(target);
      const isInsideMenu = dropdownMenuRef.current && dropdownMenuRef.current.contains(target);
      if (!isInsideButton && !isInsideMenu) {
        setShowAgentDropdown(false);
      }
    };
    if (showAgentDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAgentDropdown]);

  // Use agents prop if provided, otherwise use locally loaded agents
  const agentList = agents || availableAgents;

  // Get display config for an agent type
  const getConfig = (agentType: string) => {
    const agentInfo = findAgentInfo(agentList, agentType);
    return getAgentDisplayConfig(agentInfo?.icon, agentInfo?.color);
  };

  // Get display name for an agent type
  const getDisplayName = (agentType: string) => {
    const agentInfo = findAgentInfo(agentList, agentType);
    return getAgentDisplayName(agentType, agentInfo?.displayName);
  };

  const startEditing = (tab: ChatTab) => {
    setEditingTabId(tab.id);
    setEditLabel(tab.label || getDisplayName(tab.agent_type));
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const finishEditing = () => {
    if (editingTabId && editLabel.trim()) {
      onRenameTab(editingTabId, editLabel.trim());
    }
    setEditingTabId(null);
    setEditLabel('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
      setEditLabel('');
    }
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-base-200 border-b border-base-300 overflow-x-auto overflow-y-visible">
      {tabs.map((tab) => {
        const config = getConfig(tab.agent_type);
        const isActive = tab.id === activeTabId;
        const displayName = tab.label || getDisplayName(tab.agent_type);
        const isEditing = editingTabId === tab.id;

        return (
          <div
            key={tab.id}
            className={`
              group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer
              transition-all duration-150 min-w-[120px] max-w-[200px]
              ${isActive
                ? `${config.bg} border ${config.border}/30`
                : 'hover:bg-base-300 border border-transparent'
              }
            `}
            onClick={() => !isEditing && onTabClick(tab.id)}
          >
            {/* Agent Icon with colored background */}
            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-sm leading-none flex-shrink-0 ${config.bg} ${config.border} border`}>
              {config.icon}
            </span>

            {/* Tab Name */}
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onBlur={finishEditing}
                onKeyDown={handleKeyDown}
                className="input input-xs input-bordered flex-1 min-w-0"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={`text-sm truncate flex-1 ${isActive ? 'font-medium' : ''}`}>
                {displayName}
              </span>
            )}

            {/* Activity indicator (unread messages) */}
            {!isActive && tabsWithActivity.has(tab.id) && (
              <span className="flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            )}

            {/* Session indicator (actively running session in memory) */}
            {sessionsByTab.has(tab.id) && !tabsWithActivity.has(tab.id) && (
              <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" title="Active session" />
            )}

            {/* Actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {isEditing ? (
                <button
                  className="btn btn-ghost btn-xs p-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    finishEditing();
                  }}
                >
                  <Check className="w-3 h-3" />
                </button>
              ) : (
                <button
                  className="btn btn-ghost btn-xs p-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(tab);
                  }}
                  title="Rename tab"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}

              {tabs.length > 1 && (
                <button
                  className="btn btn-ghost btn-xs p-0.5 hover:text-error"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  title="Close tab"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Add Tab Button with Dropdown */}
      <div className="flex items-center flex-shrink-0" ref={dropdownRef}>
        <button
          className="btn btn-ghost btn-sm px-2"
          onClick={onAddTab}
          title="New chat tab (default agent)"
        >
          <Plus className="w-4 h-4" />
        </button>
        {onAddTabWithAgent && (
          <button
            className="btn btn-ghost btn-sm px-1"
            onClick={() => setShowAgentDropdown(!showAgentDropdown)}
            title="Choose agent for new tab"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown rendered outside scrollable area using fixed positioning */}
      {showAgentDropdown && onAddTabWithAgent && (
        <div
          ref={dropdownMenuRef}
          className="fixed z-[100] bg-base-200 border border-base-300 rounded-lg shadow-lg min-w-[200px]"
          style={{
            top: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().bottom + 4 : 0,
            right: dropdownRef.current ? window.innerWidth - dropdownRef.current.getBoundingClientRect().right : 0,
          }}
        >
          <div className="p-2">
            <div className="text-xs text-base-content/60 px-2 py-1 mb-1">Select Agent</div>
            {availableAgents.length === 0 ? (
              <div className="px-2 py-2 text-sm text-base-content/60">
                <span className="loading loading-spinner loading-xs mr-2"></span>
                Loading agents...
              </div>
            ) : (
              availableAgents.filter(a => a.available).map((agent) => {
                const config = getAgentDisplayConfig(agent.icon, agent.color);
                return (
                  <button
                    key={agent.name}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-base-300 text-left"
                    onClick={() => {
                      console.log('[ChatTabBar] Agent selected:', agent.name);
                      onAddTabWithAgent(agent.name);
                      setShowAgentDropdown(false);
                    }}
                  >
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-sm leading-none ${config.bg} ${config.border} border`}>
                      {config.icon}
                    </span>
                    <span className="text-sm">{agent.displayName || agent.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
