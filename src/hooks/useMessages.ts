import { useState, useEffect, useCallback } from 'react';
import { conversations, messages } from '../lib/supabaseClient';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
  isVoice?: boolean;
  duration?: number;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  isActive: boolean;
}

interface MessagesState {
  conversations: Conversation[];
  currentMessages: Message[];
  loading: boolean;
  error: string | null;
}

export const useMessages = (userId: string) => {
  const [state, setState] = useState<MessagesState>({
    conversations: [],
    currentMessages: [],
    loading: false,
    error: null,
  });

  // Load conversations
  const loadConversations = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await conversations.getAll(userId);
      
      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return;
      }

      const formattedConversations: Conversation[] = (data || []).map(conv => ({
        id: conv.id,
        title: conv.title,
        lastMessage: 'Last message...', // This would come from the last message
        timestamp: new Date(conv.updated_at),
        isActive: true, // This would be determined by activity
      }));

      setState(prev => ({
        ...prev,
        conversations: formattedConversations,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load conversations',
      }));
    }
  }, [userId]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await messages.getAll(conversationId);
      
      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return;
      }

      const formattedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        isUser: msg.user_id === userId,
        isVoice: msg.is_voice,
        duration: msg.duration,
      }));

      setState(prev => ({
        ...prev,
        currentMessages: formattedMessages,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load messages',
      }));
    }
  }, [userId]);

  // Create new conversation
  const createConversation = useCallback(async (title: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await conversations.create(userId, title);
      
      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { success: false, error: error.message };
      }

      if (data) {
        const newConversation: Conversation = {
          id: data.id,
          title: data.title,
          lastMessage: '',
          timestamp: new Date(data.created_at),
          isActive: true,
        };

        setState(prev => ({
          ...prev,
          conversations: [newConversation, ...prev.conversations],
          loading: false,
        }));

        return { success: true, conversationId: data.id };
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to create conversation',
      }));
      return { success: false, error: 'Failed to create conversation' };
    }
  }, [userId]);

  // Send message
  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    isVoice = false,
    duration?: number
  ) => {
    try {
      const { data, error } = await messages.create(
        conversationId,
        userId,
        content,
        isVoice,
        duration
      );
      
      if (error) {
        setState(prev => ({
          ...prev,
          error: error.message,
        }));
        return { success: false, error: error.message };
      }

      if (data) {
        const newMessage: Message = {
          id: data.id,
          content: data.content,
          timestamp: new Date(data.created_at),
          isUser: true,
          isVoice: data.is_voice,
          duration: data.duration,
        };

        setState(prev => ({
          ...prev,
          currentMessages: [...prev.currentMessages, newMessage],
        }));

        // Update conversation timestamp
        await conversations.update(conversationId, {
          updated_at: new Date().toISOString(),
        });

        return { success: true, messageId: data.id };
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to send message',
      }));
      return { success: false, error: 'Failed to send message' };
    }
  }, [userId]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { error } = await conversations.delete(conversationId);
      
      if (error) {
        setState(prev => ({
          ...prev,
          error: error.message,
        }));
        return { success: false, error: error.message };
      }

      setState(prev => ({
        ...prev,
        conversations: prev.conversations.filter(conv => conv.id !== conversationId),
        currentMessages: [], // Clear messages when conversation is deleted
      }));

      return { success: true };
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to delete conversation',
      }));
      return { success: false, error: 'Failed to delete conversation' };
    }
  }, []);

  // Update conversation title
  const updateConversationTitle = useCallback(async (conversationId: string, newTitle: string) => {
    try {
      const { data, error } = await conversations.update(conversationId, { title: newTitle });
      
      if (error) {
        setState(prev => ({
          ...prev,
          error: error.message,
        }));
        return { success: false, error: error.message };
      }

      if (data) {
        setState(prev => ({
          ...prev,
          conversations: prev.conversations.map(conv =>
            conv.id === conversationId
              ? { ...conv, title: data.title }
              : conv
          ),
        }));

        return { success: true };
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to update conversation title',
      }));
      return { success: false, error: 'Failed to update conversation title' };
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Load conversations on mount
  useEffect(() => {
    if (userId) {
      loadConversations();
    }
  }, [userId, loadConversations]);

  return {
    conversations: state.conversations,
    currentMessages: state.currentMessages,
    loading: state.loading,
    error: state.error,
    loadConversations,
    loadMessages,
    createConversation,
    sendMessage,
    deleteConversation,
    updateConversationTitle,
    clearError,
  };
}; 