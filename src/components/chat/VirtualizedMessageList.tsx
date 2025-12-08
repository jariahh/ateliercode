import { useMemo } from 'react';
import { User, Bot, Wrench, Sparkles } from 'lucide-react';
import type { ChatMessage } from '../workspace/ChatTab';
import CollapsibleToolMessage from './CollapsibleToolMessage';
import StreamingMessage from './StreamingMessage';
import MessageContent from './MessageContent';
import MessageActions from './MessageActions';

interface VirtualizedMessageListProps {
  messages: ChatMessage[];
  formatTimestamp: (date: Date) => string;
}

// Render window: Only render the most recent N messages to prevent performance degradation
const RENDER_WINDOW_SIZE = 100;

export default function VirtualizedMessageList({
  messages,
  formatTimestamp,
}: VirtualizedMessageListProps) {
  // Only render the last N messages for performance
  const visibleMessages = useMemo(() => {
    if (messages.length <= RENDER_WINDOW_SIZE) {
      return messages;
    }
    return messages.slice(-RENDER_WINDOW_SIZE);
  }, [messages]);

  const hiddenCount = messages.length - visibleMessages.length;

  return (
    <>
      {/* Show indicator if some messages are hidden */}
      {hiddenCount > 0 && (
        <div className="text-center py-4 text-sm text-base-content/60">
          {hiddenCount} older messages hidden for performance.
          Use the search or scroll up to load more.
        </div>
      )}

      {visibleMessages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-3 group ${
            message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div
              className={`w-10 h-10 rounded-full ${
                message.role === 'user'
                  ? 'bg-primary text-primary-content'
                  : message.metadata?.tool_name || message.metadata?.is_tool_result === 'true' ||
                    message.content.includes('🔧 Using tool:') || message.content.includes('Tool Result:')
                  ? 'bg-info text-info-content'
                  : 'bg-secondary text-secondary-content'
              } flex items-center justify-center`}
            >
              {message.role === 'user' ? (
                <User className="w-5 h-5" />
              ) : message.metadata?.tool_name || message.metadata?.is_tool_result === 'true' ||
                message.content.includes('🔧 Using tool:') || message.content.includes('Tool Result:') ? (
                <Wrench className="w-5 h-5" />
              ) : message.isStreaming ? (
                <Sparkles className="w-5 h-5 animate-pulse" />
              ) : (
                <Bot className="w-5 h-5" />
              )}
            </div>
          </div>

          {/* Message Content */}
          <div
            className={`flex flex-col max-w-[75%] ${
              message.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`rounded-2xl ${
                message.role === 'user'
                  ? 'bg-base-300/70'
                  : 'bg-base-200/70'
              } ${
                message.status === 'error'
                  ? 'border-2 border-error'
                  : 'border border-base-content/5'
              } ${
                message.metadata?.type === 'tool_use' || message.metadata?.type === 'tool_result'
                  ? 'bg-base-300 border-base-content/10'
                  : ''
              } px-4 py-3 relative shadow-sm`}
            >
              {/* Check if this is a tool message by metadata or content */}
              {message.metadata?.tool_name ||
               message.metadata?.is_tool_result === 'true' ||
               message.content.includes('🔧 Using tool:') ||
               message.content.includes('✅ Tool Result:') ||
               message.content.includes('❌ Tool Error:') ? (
                <CollapsibleToolMessage
                  content={message.content}
                  metadata={message.metadata}
                />
              ) : message.role === 'assistant' ? (
                <StreamingMessage
                  content={message.content}
                  isStreaming={message.isStreaming || false}
                  speed={8}
                />
              ) : (
                <MessageContent content={message.content} />
              )}

              {message.status === 'error' && message.metadata?.error && (
                <div className="text-xs text-error mt-2 flex items-center gap-1">
                  <span>{message.metadata.error}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 px-2">
              <span className="text-xs text-base-content/50">
                {formatTimestamp(message.timestamp)}
              </span>

              {message.metadata?.processingTime && (
                <span className="text-xs text-base-content/40">
                  • {(message.metadata.processingTime / 1000).toFixed(1)}s
                </span>
              )}

              <MessageActions
                content={message.content}
                role={message.role}
              />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
