import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as chatApi from '../../api/chat';
import type { ChatMessage as BackendChatMessage } from '../../types/tauri';
import CodeBlock from '../chat/CodeBlock';
import MessageActions from '../chat/MessageActions';
import QuickActions from '../chat/QuickActions';
import StreamingMessage from '../chat/StreamingMessage';
import MessageSkeleton from '../chat/MessageSkeleton';

export type MessageStatus = 'sending' | 'sent' | 'streaming' | 'completed' | 'error';

export interface MessageMetadata {
  tokensUsed?: number;
  processingTime?: number;
  model?: string;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  metadata?: MessageMetadata;
  isStreaming?: boolean;
}

export interface ChatTabProps {
  projectId?: string;
}

// Helper function to convert backend message to frontend format
function convertMessage(backendMsg: BackendChatMessage): ChatMessage {
  // Parse metadata if available
  let metadata: MessageMetadata | undefined;
  if (backendMsg.metadata) {
    try {
      metadata = JSON.parse(backendMsg.metadata);
    } catch (e) {
      console.warn('Failed to parse message metadata:', e);
    }
  }

  return {
    id: backendMsg.id,
    role: backendMsg.role as 'user' | 'assistant',
    content: backendMsg.content,
    timestamp: new Date(backendMsg.timestamp * 1000),
    status: 'completed',
    metadata,
    isStreaming: false,
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

  const handleSend = async (messageContent?: string) => {
    const content = messageContent || inputValue.trim();
    if (!content || isTyping || !projectId) return;

    setInputValue('');
    setIsTyping(true);
    setError(null);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const startTime = Date.now();

      // Send message to backend
      const aiResponse = await chatApi.sendMessage(projectId, content);

      const processingTime = Date.now() - startTime;

      // Convert AI response
      const aiMessage = convertMessage(aiResponse);
      aiMessage.metadata = {
        ...aiMessage.metadata,
        processingTime,
      };
      aiMessage.isStreaming = true; // Enable streaming effect for new messages

      // Update user message to 'sent' and add AI response
      setMessages((prev) => {
        const updated = [...prev];
        const userMsgIndex = updated.findIndex((m) => m.id === userMessage.id);
        if (userMsgIndex !== -1) {
          updated[userMsgIndex] = {
            ...updated[userMsgIndex],
            status: 'sent',
          };
        }
        return [...updated, aiMessage];
      });

      // After a delay, mark streaming as complete
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessage.id ? { ...m, isStreaming: false } : m
          )
        );
      }, aiMessage.content.length * 10 + 100);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');

      // Update user message to show error
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMessage.id
            ? { ...m, status: 'error', metadata: { error: 'Failed to send' } }
            : m
        )
      );

      // Restore the input value so user can retry
      setInputValue(content);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleRetryMessage = async (messageId: string) => {
    // Find the message and resend it
    const message = messages.find((m) => m.id === messageId);
    if (message && message.role === 'assistant') {
      // Find the previous user message
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex > 0) {
        const userMessage = messages[messageIndex - 1];
        if (userMessage.role === 'user') {
          // Remove the AI message and retry
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
          await handleSend(userMessage.content);
        }
      }
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

  // Show loading state with skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-280px)] bg-base-200 rounded-lg overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <MessageSkeleton />
          <MessageSkeleton />
          <MessageSkeleton />
        </div>
        <div className="border-t border-base-300 bg-base-100 p-4">
          <div className="flex items-center gap-2 text-base-content/60">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading chat history...</span>
          </div>
        </div>
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
                        : 'bg-secondary text-secondary-content'
                    } flex items-center justify-center`}
                  >
                    {message.role === 'user' ? (
                      <User className="w-5 h-5" />
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
                    className={`chat-bubble ${
                      message.role === 'user'
                        ? 'chat-bubble-primary'
                        : 'chat-bubble-secondary'
                    } ${
                      message.status === 'error'
                        ? 'border-2 border-error'
                        : ''
                    } px-4 py-3 relative`}
                  >
                    {message.role === 'assistant' ? (
                      <StreamingMessage
                        content={message.content}
                        isStreaming={message.isStreaming || false}
                        speed={8}
                      />
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        {message.content}
                      </div>
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
                      onRetry={
                        message.role === 'assistant'
                          ? () => handleRetryMessage(message.id)
                          : undefined
                      }
                    />
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

      {/* Quick Actions */}
      {messages.length === 0 && !isLoading && (
        <QuickActions
          onActionClick={handleQuickAction}
          disabled={isTyping}
        />
      )}

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
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isTyping}
              className="btn btn-primary"
              title="Send message (Enter)"
            >
              {isTyping ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
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
