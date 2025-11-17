import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import * as chatApi from '../../api/chat';
import type { ChatMessage as BackendChatMessage } from '../../types/tauri';

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
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Helper function to convert backend message to frontend format
function convertMessage(backendMsg: BackendChatMessage): ChatMessage {
  return {
    id: backendMsg.id,
    role: backendMsg.role as 'user' | 'assistant',
    content: backendMsg.content,
    timestamp: new Date(backendMsg.timestamp * 1000), // Convert Unix timestamp to Date
  };
}

export default function ChatTab({ projectId }: ChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load messages on mount
  useEffect(() => {
    const loadMessages = async () => {
      if (!projectId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const backendMessages = await chatApi.getMessages(projectId);
        const convertedMessages = backendMessages.map(convertMessage);
        setMessages(convertedMessages);
      } catch (err) {
        console.error('Failed to load messages:', err);
        setError('Failed to load chat history');
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [projectId]);

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
    if (!inputValue.trim() || isTyping || !projectId) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    setIsTyping(true);
    setError(null);

    try {
      // Send message to backend (which saves both user message and AI response)
      await chatApi.sendMessage(projectId, messageContent);

      // Reload messages to get both user message and AI response
      const backendMessages = await chatApi.getMessages(projectId);
      const convertedMessages = backendMessages.map(convertMessage);
      setMessages(convertedMessages);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
      // Restore the input value so user can retry
      setInputValue(messageContent);
    } finally {
      setIsTyping(false);
    }
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-280px)] bg-base-200 rounded-lg overflow-hidden items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-base-content/60">Loading chat history...</p>
      </div>
    );
  }

  // Show error if no project ID
  if (!projectId) {
    return (
      <div className="flex flex-col h-[calc(100vh-280px)] bg-base-200 rounded-lg overflow-hidden items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">No Project Selected</h3>
          <p className="text-base-content/60">Please select a project to start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] bg-base-200 rounded-lg overflow-hidden">
      {/* Error Alert */}
      {error && (
        <div className="alert alert-error m-4 mb-0">
          <span>{error}</span>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && !isLoading ? (
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
                                style={vscDarkPlus}
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
