import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import axios from 'axios';

const API_URL = 'https://your-backend-url.com/api'; // Replace with your actual API URL

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
}

const ChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  
  // Load conversation history
  useEffect(() => {
    fetchConversations();
  }, []);
  
  // Fetch most recent conversation
  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API_URL}/conversations`);
      
      // If there are any conversations, load the most recent one
      if (response.data.conversations && response.data.conversations.length > 0) {
        const mostRecent = response.data.conversations[0];
        setConversationId(mostRecent.id);
        
        // Fetch messages for this conversation
        fetchMessages(mostRecent.id);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };
  
  // Fetch messages for a conversation
  const fetchMessages = async (convId: string) => {
    try {
      setLoading(true);
      
      const response = await axios.get(`${API_URL}/conversations/${convId}/messages`);
      
      // Format messages
      const formattedMessages = response.data.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender === 'user' ? 'user' : 'assistant',
        timestamp: msg.created_at,
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Send a message
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    
    // Add message to UI immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      // Prepare API request
      const response = await axios.post(`${API_URL}/ai/chat`, {
        conversationId,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant for Command My Startup.',
          },
          ...messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content,
          })),
          {
            role: 'user',
            content: userMessage.content,
          },
        ],
      });
      
      // If this is a new conversation, update the ID
      if (!conversationId && response.data.conversationId) {
        setConversationId(response.data.conversationId);
      }
      
      // Add AI response to messages
      const assistantMessage: Message = {
        id: Date.now().toString() + '-ai',
        content: response.data.content,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Render message item
  const renderMessageItem = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender === 'user' ? styles.userBubble : styles.aiBubble,
      ]}
    >
      <Text style={styles.messageText}>{item.content}</Text>
    </View>
  );
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {loading && messages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={item => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet. Start a conversation!</Text>
            </View>
          }
        />
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          style={styles.input}
          multiline
          disabled={loading}
        />
        <Button
          mode="contained"
          onPress={sendMessage}
          disabled={!input.trim() || loading}
          loading={loading}
          style={styles.sendButton}
        >
          Send
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1E88E5',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0E0E0',
  },
  messageText: {
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    alignSelf: 'flex-end',
  },
});

export default ChatScreen;
