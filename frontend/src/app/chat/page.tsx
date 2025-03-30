'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  
  // Fetch conversations
  useEffect(() => {
    if (!user) return;
    
    const fetchConversations = async () => {
      try {
        const response = await fetch('/api/conversations');
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch conversations');
        }
        
        const data = await response.json();
        setConversations(data.conversations);
      } catch (error: any) {
        console.error('Error fetching conversations:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchConversations();
  }, [user]);
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Handle new chat button
  const handleNewChat = () => {
    router.push('/chat/new');
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Conversations</h1>
        <button
          onClick={handleNewChat}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Chat
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <h2 className="text-xl font-semibold mb-2">No conversations yet</h2>
          <p className="text-gray-500 mb-6">Start a new chat to begin talking with the AI assistant.</p>
          <button
            onClick={handleNewChat}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Start New Chat
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {conversations.map(conversation => (
            <Link
              key={conversation.id}
              href={`/chat/${conversation.id}`}
              className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition hover:shadow-md border border-gray-200 dark:border-gray-700"
            >
              <h3 className="font-medium text-lg mb-2 truncate">{conversation.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(conversation.updated_at)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
