"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { AVAILABLE_MODELS } from "@/lib/ai/client";
import { useAuth } from "@/lib/auth/hooks";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";

interface Message {
  id?: string;
  role: "system" | "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface ChatInterfaceProps {
  initialMessages?: Message[];
  initialConversationId?: string;
  projectId?: string;
}

export default function ChatInterface({
  initialMessages = [],
  initialConversationId,
  projectId,
}: ChatInterfaceProps) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const params = useParams();

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState("gpt-3.5-turbo");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages if conversationId is provided
  useEffect(() => {
    if (conversationId && messages.length === 0) {
      fetchMessages();
    }
  }, [conversationId]);

  // Fetch messages for current conversation
  const fetchMessages = async () => {
    if (!conversationId) return;

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`,
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch messages");
      }

      const data = await response.json();

      // Convert messages to our format
      const formattedMessages = data.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
        timestamp: msg.created_at,
      }));

      setMessages(formattedMessages);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      setError(error.message);
    }
  };

  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading) return;

    // Add user message to UI immediately
    const userMessage: Message = {
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((messages) => [...messages, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    try {
      // Prepare messages for API request
      const apiMessages = [
        // System message for setting context
        {
          role: "system",
          content:
            "You are a helpful AI assistant for Command My Startup, a platform that helps entrepreneurs build and grow their businesses. Provide clear, concise, and helpful responses. You can use markdown formatting in your responses.",
        },
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        userMessage,
      ];

      // Send message to API
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          messages: apiMessages,
          model,
          projectId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send message");
      }

      const data = await response.json();

      // Update conversationId if new
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);

        // Update URL without refreshing if on chat page
        if (params.conversationId === "new") {
          router.replace(`/chat/${data.conversationId}`);
        }
      }

      // Add assistant response to messages
      const assistantMessage: Message = {
        role: "assistant",
        content: data.content,
        timestamp: new Date().toISOString(),
      };

      setMessages((messages) => [...messages, assistantMessage]);
    } catch (error: any) {
      console.error("Error sending message:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle model change
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value);
  };

  // User's subscription tier
  const userTier = profile?.subscription_tier || "free";

  // Filter models based on user's tier
  const availableModels = AVAILABLE_MODELS.filter((m) => {
    const tierLevels = {
      free: 0,
      standard: 1,
      pro: 2,
      enterprise: 3,
    };

    const userTierLevel = tierLevels[userTier as keyof typeof tierLevels];
    const requiredTierLevel =
      tierLevels[m.tierRequirement as keyof typeof tierLevels];

    return userTierLevel >= requiredTierLevel;
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Chat header */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium">
            {conversationId ? "Conversation" : "New Chat"}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {messages.length > 0
              ? `${messages.length} messages`
              : "Start a new conversation"}
          </p>
        </div>

        <div className="flex items-center">
          <label htmlFor="model" className="text-sm font-medium mr-2">
            Model:
          </label>
          <select
            id="model"
            value={model}
            onChange={handleModelChange}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
          >
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <svg
              className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Start a new conversation
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Type a message below to start chatting with the AI assistant
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose dark:prose-invert prose-sm max-w-none">
                    <MarkdownRenderer content={message.content} />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}

                {message.timestamp && (
                  <div
                    className={`text-xs mt-1 ${
                      message.role === "user"
                        ? "text-blue-200"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {formatTimestamp(message.timestamp)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                <div
                  className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg p-3 max-w-[80%]">
              <p className="text-sm font-medium">Error: {error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-40 dark:bg-gray-700 dark:text-white"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
                transform="rotate(90 12 12)"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
