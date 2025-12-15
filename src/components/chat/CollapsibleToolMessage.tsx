import { useState } from 'react';
import { Terminal, CheckCircle2, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import MessageContent from './MessageContent';
import type { MessageMetadata } from '../workspace/ChatTab';

interface CollapsibleToolMessageProps {
  content: string;
  metadata?: MessageMetadata;
}

export default function CollapsibleToolMessage({ content, metadata }: CollapsibleToolMessageProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Check if this is a merged tool message from plugin
  const isToolMessage = metadata?.is_tool_message === 'true';
  const isPending = metadata?.is_pending === 'true';
  const isError = metadata?.is_error === 'true';
  const toolName = metadata?.tool_name || '';

  // If not a tool message, render as regular content
  if (!isToolMessage) {
    return <MessageContent content={content} />;
  }

  // Content is just the header: "✓ Bash(description) completed"
  // Result is stored in metadata.tool_result
  const resultContent = metadata?.tool_result || '';

  // Parse tool input from metadata if available
  let toolInput: Record<string, any> | null = null;
  if (metadata?.tool_input) {
    try {
      toolInput = JSON.parse(metadata.tool_input);
    } catch {}
  }

  // Get description for display
  const description = toolInput?.description || '';
  const command = toolInput?.command || '';

  // Determine status icon and color
  const getStatusDisplay = () => {
    if (isPending) {
      return {
        icon: <Clock className="w-3.5 h-3.5 animate-pulse" />,
        color: 'text-warning',
        label: 'Running'
      };
    }
    if (isError) {
      return {
        icon: <Terminal className="w-3.5 h-3.5" />,
        color: 'text-error',
        label: 'Failed'
      };
    }
    return {
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      color: 'text-success',
      label: 'Completed'
    };
  };

  const status = getStatusDisplay();

  // Format the display header
  const getDisplayHeader = () => {
    if (toolName === 'Bash' && description) {
      return `${toolName}(${description})`;
    }
    if (toolName) {
      return toolName;
    }
    // Fallback: extract from content
    const match = content.match(/[✓❌⏳]\s*(.+?)\s*(completed|failed|running)/);
    return match ? match[1] : 'Tool';
  };

  return (
    <div className="space-y-1">
      {/* Compact header */}
      <div className={`flex items-center gap-2 text-xs ${status.color}`}>
        {status.icon}
        <span className="font-medium">{getDisplayHeader()}</span>
        <span className="text-base-content/50">{status.label}</span>
      </div>

      {/* Expandable details - always show for tool messages */}
      {(isToolMessage || command || resultContent || (toolInput && Object.keys(toolInput).length > 0)) && (
        <div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs text-base-content/50 hover:text-base-content/80 transition-colors"
          >
            {showDetails ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            <span>Details</span>
            {!showDetails && resultContent && (
              <span className="text-base-content/30 truncate max-w-[300px] font-mono ml-1">
                {resultContent.split('\n')[0].substring(0, 50)}
                {resultContent.length > 50 ? '...' : ''}
              </span>
            )}
          </button>

          {showDetails && (
            <div className="mt-2 space-y-2">
              {/* Command (for Bash) */}
              {command && (
                <div>
                  <div className="text-xs text-base-content/50 mb-1">Command:</div>
                  <pre className="text-xs bg-base-300/50 p-2 rounded font-mono overflow-x-auto whitespace-pre-wrap break-all text-base-content/80">
                    {command}
                  </pre>
                </div>
              )}

              {/* Other tool params (non-Bash) */}
              {!command && toolInput && Object.keys(toolInput).length > 0 && (
                <div>
                  <div className="text-xs text-base-content/50 mb-1">Parameters:</div>
                  <div className="text-xs bg-base-300/50 p-2 rounded space-y-1">
                    {Object.entries(toolInput).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-base-content/50 font-mono">{key}:</span>
                        <span className="text-base-content/80 font-mono flex-1 break-all">
                          {typeof value === 'string' ? value : JSON.stringify(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Result/Output */}
              {resultContent && (
                <div>
                  <div className="text-xs text-base-content/50 mb-1">
                    {isError ? 'Error:' : 'Result:'}
                  </div>
                  <pre className={`text-xs p-2 rounded font-mono overflow-x-auto whitespace-pre-wrap break-words ${
                    isError ? 'bg-error/10 text-error' : 'bg-base-300/50 text-base-content/80'
                  }`}>
                    {resultContent}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
