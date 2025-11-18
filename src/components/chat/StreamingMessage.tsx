import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
  speed?: number;
}

export default function StreamingMessage({ content, isStreaming, speed = 10 }: StreamingMessageProps) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(!isStreaming);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayText(content);
      setIsComplete(true);
      return;
    }

    setIsComplete(false);
    setDisplayText('');

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayText(content.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [content, isStreaming, speed]);

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeContent = String(children).replace(/\n$/, '');

            return !inline && match ? (
              <CodeBlock language={match[1]} inline={false}>
                {codeContent}
              </CodeBlock>
            ) : (
              <CodeBlock language="text" inline={true}>
                {codeContent}
              </CodeBlock>
            );
          },
          // Style other markdown elements
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary pl-4 italic my-2">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-2">
                <table className="table table-sm table-zebra">{children}</table>
              </div>
            );
          },
        }}
      >
        {displayText}
      </ReactMarkdown>
      {!isComplete && <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-0.5" />}
    </div>
  );
}
