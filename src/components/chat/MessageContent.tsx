import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
}

export default function MessageContent({ content, isStreaming = false }: MessageContentProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks and inline code
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
          // Paragraphs
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>;
          },
          // Unordered lists
          ul({ children }) {
            return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
          },
          // Ordered lists
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
          },
          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary pl-4 italic my-2">
                {children}
              </blockquote>
            );
          },
          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-2">
                <table className="table table-sm table-zebra">{children}</table>
              </div>
            );
          },
          // Links - sanitized and safe
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary"
              >
                {children}
              </a>
            );
          },
          // Headings
          h1({ children }) {
            return <h1 className="text-xl font-bold mb-2 mt-3 first:mt-0">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-bold mb-2 mt-2 first:mt-0">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h4>;
          },
          // Horizontal rule
          hr() {
            return <hr className="my-3 border-base-300" />;
          },
          // Strong/Bold
          strong({ children }) {
            return <strong className="font-bold">{children}</strong>;
          },
          // Emphasis/Italic
          em({ children }) {
            return <em className="italic">{children}</em>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-0.5" />}
    </div>
  );
}
