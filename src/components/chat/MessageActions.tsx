import { Copy, RotateCw, Edit2, Check } from 'lucide-react';
import { useState } from 'react';

interface MessageActionsProps {
  content: string;
  onRetry?: () => void;
  onEdit?: () => void;
  role: 'user' | 'assistant';
}

export default function MessageActions({ content, onRetry, onEdit, role }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={handleCopy}
        className="btn btn-xs btn-ghost gap-1"
        title="Copy message"
      >
        {copied ? (
          <Check className="w-3 h-3" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>

      {role === 'user' && onEdit && (
        <button
          onClick={onEdit}
          className="btn btn-xs btn-ghost gap-1"
          title="Edit message"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      )}

      {role === 'assistant' && onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-xs btn-ghost gap-1"
          title="Regenerate response"
        >
          <RotateCw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
