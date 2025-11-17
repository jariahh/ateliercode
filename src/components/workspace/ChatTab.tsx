import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatTabProps {
  projectId?: string;
}

// Type for react-markdown code props
interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Mock conversation data
const mockMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: `Hello! I'm your AI assistant for this project. I can help you with:

- Writing and refactoring code
- Debugging issues
- Explaining complex concepts
- Reviewing code changes
- Suggesting improvements

What would you like to work on today?`,
    timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
  },
  {
    id: '2',
    role: 'user',
    content: 'Can you help me create a React component for a user profile card?',
    timestamp: new Date(Date.now() - 1000 * 60 * 8), // 8 minutes ago
  },
  {
    id: '3',
    role: 'assistant',
    content: `Of course! Here's a beautiful user profile card component using TypeScript and Tailwind CSS:

\`\`\`tsx
interface UserProfileProps {
  name: string;
  email: string;
  avatar?: string;
  role: string;
  bio?: string;
}

export default function UserProfile({ name, email, avatar, role, bio }: UserProfileProps) {
  return (
    <div className="card bg-base-200 shadow-xl max-w-md">
      <div className="card-body items-center text-center">
        <div className="avatar">
          <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
            {avatar ? (
              <img src={avatar} alt={name} />
            ) : (
              <div className="bg-primary text-primary-content flex items-center justify-center text-2xl font-bold">
                {name.charAt(0)}
              </div>
            )}
          </div>
        </div>
        <h2 className="card-title text-2xl">{name}</h2>
        <div className="badge badge-primary">{role}</div>
        <p className="text-sm text-base-content/70">{email}</p>
        {bio && <p className="text-base-content/80 mt-2">{bio}</p>}
        <div className="card-actions mt-4">
          <button className="btn btn-primary">Edit Profile</button>
          <button className="btn btn-outline">View Details</button>
        </div>
      </div>
    </div>
  );
}
\`\`\`

This component:
- Uses TypeScript for type safety
- Supports optional avatar images with a fallback to initials
- Displays user information in a clean card layout
- Includes action buttons for editing and viewing details
- Uses DaisyUI components for consistent styling

Would you like me to add any additional features?`,
    timestamp: new Date(Date.now() - 1000 * 60 * 7), // 7 minutes ago
  },
  {
    id: '4',
    role: 'user',
    content: 'This looks great! Can you also add a way to display social media links?',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
  },
];

export default function ChatTab({}: ChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Great question! Let me help you with that. This is a simulated response for: "${userMessage.content}"`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const characterCount = inputValue.length;
  const maxCharacters = 4000;

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] bg-base-200 rounded-lg overflow-hidden">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Start a Conversation</h3>
            <p className="text-base-content/60 max-w-md">
              Ask me anything about your project. I can help with coding, debugging,
              refactoring, and more.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`avatar ${
                    message.role === 'user' ? 'placeholder' : ''
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-content'
                        : 'bg-secondary text-secondary-content'
                    } flex items-center justify-center`}
                  >
                    {message.role === 'user' ? (
                      <User className="w-5 h-5" />
                    ) : (
                      <Bot className="w-5 h-5" />
                    )}
                  </div>
                </div>

                {/* Message Content */}
                <div
                  className={`flex flex-col max-w-[70%] ${
                    message.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`chat-bubble ${
                      message.role === 'user'
                        ? 'chat-bubble-primary'
                        : 'chat-bubble-secondary'
                    } px-4 py-3`}
                  >
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          code({ inline, className, children }: CodeProps) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus as any}
                                language={match[1]}
                                PreTag="div"
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div className="text-xs text-base-content/50 mt-1 px-2">
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3">
                <div className="avatar">
                  <div className="w-10 h-10 rounded-full bg-secondary text-secondary-content flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                </div>
                <div className="chat-bubble chat-bubble-secondary px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-base-300 bg-base-100 p-4">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your project... (Shift+Enter for new line)"
              className="textarea textarea-bordered flex-1 resize-none min-h-[50px] max-h-[200px]"
              disabled={isTyping}
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              className="btn btn-primary"
              title="Send message (Enter)"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="flex justify-between items-center text-xs text-base-content/50 px-1">
            <span>
              Press <kbd className="kbd kbd-xs">Enter</kbd> to send,{' '}
              <kbd className="kbd kbd-xs">Shift</kbd>+
              <kbd className="kbd kbd-xs">Enter</kbd> for new line
            </span>
            <span
              className={
                characterCount > maxCharacters * 0.9
                  ? 'text-warning'
                  : characterCount > maxCharacters
                  ? 'text-error'
                  : ''
              }
            >
              {characterCount} / {maxCharacters}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
