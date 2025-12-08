import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  children: string;
  inline?: boolean;
}

export default function CodeBlock({ language, children, inline }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Detect theme changes
  useEffect(() => {
    const checkTheme = () => {
      const htmlElement = document.documentElement;
      const theme = htmlElement.getAttribute('data-theme');
      // List of dark themes in DaisyUI
      const darkThemes = ['dark', 'night', 'dracula', 'synthwave', 'forest', 'coffee', 'black'];
      setIsDark(darkThemes.includes(theme || ''));
    };

    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  if (inline) {
    return (
      <code className="px-1.5 py-0.5 bg-base-300 rounded text-sm font-mono text-accent-content">
        {children}
      </code>
    );
  }

  return (
    <div className="relative group my-3">
      <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="btn btn-xs btn-ghost gap-1 bg-base-200/80 backdrop-blur-sm"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="rounded-lg overflow-hidden border border-base-300">
        <div className="bg-base-300 px-3 py-1.5 text-xs text-base-content/60 font-mono flex items-center justify-between">
          <span>{language}</span>
        </div>
        <SyntaxHighlighter
          style={isDark ? vscDarkPlus : vs}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '0.875rem',
            padding: '1rem',
            background: isDark ? '#1e1e1e' : '#ffffff',
          }}
          showLineNumbers={language !== 'text' && children.split('\n').length > 5}
          lineNumberStyle={{
            minWidth: '2.5em',
            paddingRight: '1em',
            color: isDark ? '#858585' : '#afafaf',
            textAlign: 'right',
            userSelect: 'none',
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
