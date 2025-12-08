import { useState, useRef, useEffect } from 'react';
import { Wrench, Terminal, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import MessageContent from './MessageContent';
import type { MessageMetadata } from '../workspace/ChatTab';

interface CollapsibleToolMessageProps {
  content: string;
  metadata?: MessageMetadata;
}

export default function CollapsibleToolMessage({ content, metadata }: CollapsibleToolMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxCollapsedHeight = 150;
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setNeedsCollapse(height > maxCollapsedHeight);
    }
  }, [content]);

  const isToolUse = metadata?.tool_name || content.includes('🔧 Using tool:') || content.startsWith('Tool:');
  const isToolResult = metadata?.is_tool_result === 'true' || content.includes('✅ Tool Result:') || content.includes('❌ Tool Error:') || content.includes('Tool Result:');
  const isError = metadata?.is_error === 'true' || content.includes('❌ Tool Error:');

  if (!isToolUse && !isToolResult) {
    return <MessageContent content={content} />;
  }

  let toolName = metadata?.tool_name || 'Unknown Tool';
  let displayContent = content;
  let toolParams: any = null;

  if (isToolUse && content.includes('🔧 Using tool:')) {
    const lines = content.split('\n');
    const firstLine = lines[0];
    const match = firstLine.match(/🔧 Using tool:\s*(.+)/);
    if (match) {
      toolName = match[1].trim();
      displayContent = lines.slice(1).join('\n');
      try { toolParams = JSON.parse(displayContent); } catch {}
    }
  } else if (content.startsWith('Tool:')) {
    const lines = content.split('\n');
    const firstLine = lines[0];
    const match = firstLine.match(/Tool:\s*(.+)/);
    if (match) {
      toolName = match[1].trim();
      displayContent = lines.slice(1).join('\n');
      try { toolParams = JSON.parse(displayContent); } catch {}
    }
  } else if (isToolResult) {
    const lines = content.split('\n');
    displayContent = lines.slice(1).join('\n');
  }

  return (
    <div className="space-y-2 border-l-2 border-info/30 pl-3">
      <div className={`flex items-center gap-2 text-sm font-semibold ${isError ? 'text-error' : isToolResult ? 'text-success' : 'text-info'}`}>
        {isToolUse ? (
          <>
            <Wrench className="w-4 h-4" />
            <span>{toolName}</span>
          </>
        ) : isError ? (
          <>
            <Terminal className="w-4 h-4" />
            <span>Error</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>Result</span>
          </>
        )}
      </div>

      <div className="relative">
        <div
          ref={contentRef}
          className={`overflow-hidden transition-all duration-300 ${
            !isExpanded && needsCollapse ? 'max-h-[150px]' : ''
          }`}
          style={!isExpanded && needsCollapse ? { maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' } : {}}
        >
          {toolParams ? (
            <div className="text-xs bg-base-300/50 p-2 rounded space-y-1">
              {Object.entries(toolParams).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-base-content/60 font-mono">{key}:</span>
                  <span className="text-base-content font-mono flex-1 break-all">
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <pre className="text-xs bg-base-300/50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words font-mono">
              {displayContent.trim()}
            </pre>
          )}
        </div>

        {needsCollapse && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 btn btn-xs btn-ghost gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                <span>Show More</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
