import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// Types following strict TypeScript guidelines from rules.md
export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  is_voice: boolean;
  duration?: number | null;
  audio_url?: string | null;
  created_at: string;
}

export interface MessageState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
}

export interface MessageActions {
  sendMessage: (content: string, isVoice?: boolean, audioUrl?: string, duration?: number) => Promise<{ success: boolean; error?: string }>;
  deleteMessage: (messageId: string) => Promise<{ success: boolean; error?: string }>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  markAsRead: () => Promise<void>;
}

export type UseMessagesReturn = MessageState & MessageActions;

const MESSAGES_PER_PAGE = 50;

export const useMessages = (conversationId: string | null): UseMessagesReturn => {
  const [messageState, setMessageState] = useState<MessageState>({
    messages: [],
    loading: true,
    error: null,
    hasMore: true,
    totalCount: 0,
  });

  // Helper to update message state
  const updateMessageState = useCallback((updates: Partial<MessageState>) => {
    setMessageState(prev => ({ ...prev, ...updates }));
  }, []);

  // Helper to set error state
  const setError = useCallback((error: string | null) => {
    updateMessageState({ error, loading: false });
  }, [updateMessageState]);

  // Helper to set loading state
  const setLoading = useCallback((loading: boolean) => {
    updateMessageState({ loading });
  }, [updateMessageState]);

  // Fetch messages with pagination
  const fetchMessages = useCallback(async (offset = 0, append = false): Promise<Message[]> => {
    if (!conversationId) {
      setError('No conversation ID provided');
      return [];
    }

    try {
      const { data, error, count } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + MESSAGES_PER_PAGE - 1);

      if (error) {
        console.error('Error fetching messages:', error);
        setError(error.message);
        return [];
      }

      const messages = (data || []).reverse(); // Reverse to show oldest first
      const totalCount = count || 0;

      if (append) {
        updateMessageState({
          messages: [...messageState.messages, ...messages],
          hasMore: offset + MESSAGES_PER_PAGE < totalCount,
          totalCount,
          loading: false,
          error: null,
        });
      } else {
        updateMessageState({
          messages,
          hasMore: MESSAGES_PER_PAGE < totalCount,
          totalCount,
          loading: false,
          error: null,
        });
      }

      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch messages';
      setError(errorMessage);
      return [];
    }
  }, [conversationId, setError, updateMessageState, messageState.messages]);

  // Subscribe to real-time message updates
  const subscribeToMessages = useCallback(() => {
    if (!conversationId) return null;

    console.log('Subscribing to messages for conversation:', conversationId);

    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          console.log('New message received:', payload.new);
          const newMessage = payload.new as Message;
          
          // Avoid duplicates by checking if message already exists
          setMessageState(prev => {
            const exists = prev.messages.some(msg => msg.id === newMessage.id);
            if (exists) return prev;
            
            return {
              ...prev,
              messages: [...prev.messages, newMessage],
              totalCount: prev.totalCount + 1,
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          console.log('Message deleted:', payload.old);
          const deletedMessage = payload.old as Message;
          
          setMessageState(prev => ({
            ...prev,
            messages: prev.messages.filter(msg => msg.id !== deletedMessage.id),
            totalCount: Math.max(0, prev.totalCount - 1),
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          console.log('Message updated:', payload.new);
          const updatedMessage = payload.new as Message;
          
          setMessageState(prev => ({
            ...prev,
            messages: prev.messages.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            ),
          }));
        }
      )
      .subscribe((status: any) => {
        console.log('Subscription status:', status);
      });

    return subscription;
  }, [conversationId]);

  // Initialize messages and subscription
  useEffect(() => {
    if (!conversationId) {
      updateMessageState({
        messages: [],
        loading: false,
        error: null,
        hasMore: false,
        totalCount: 0,
      });
      return;
    }

    let mounted = true;

    // Fetch initial messages
    const initializeMessages = async () => {
      setLoading(true);
      setError(null);
      
      if (mounted) {
        await fetchMessages(0, false);
      }
    };

    initializeMessages();

    // Set up real-time subscription
    const subscription = subscribeToMessages();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [conversationId, fetchMessages, subscribeToMessages, setLoading, setError]);

  // Send a new message
  const sendMessage = useCallback(async (
    content: string,
    isVoice = false,
    audioUrl?: string,
    duration?: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (!conversationId) {
      return { success: false, error: 'No conversation selected' };
    }

    if (!content.trim() && !isVoice) {
      return { success: false, error: 'Message content cannot be empty' };
    }

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Insert message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          content,
          is_voice: isVoice,
          audio_url: audioUrl || null,
          duration: duration || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return { success: false, error: error.message };
      }

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      console.log('Message sent successfully:', data);
      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      return { success: false, error: errorMessage };
    }
  }, [conversationId]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('Error deleting message:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete message';
      return { success: false, error: errorMessage };
    }
  }, []);

  // Load more messages (pagination)
  const loadMore = useCallback(async (): Promise<void> => {
    if (!messageState.hasMore || messageState.loading) return;

    setLoading(true);
    await fetchMessages(messageState.messages.length, true);
  }, [messageState.hasMore, messageState.loading, messageState.messages.length, fetchMessages, setLoading]);

  // Refresh messages
  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    await fetchMessages(0, false);
  }, [fetchMessages, setLoading, setError]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // Mark messages as read (for future implementation)
  const markAsRead = useCallback(async (): Promise<void> => {
    // TODO: Implement read receipts functionality
    // This would involve updating a read_at timestamp or similar
    console.log('Mark as read functionality - to be implemented');
  }, []);

  return {
    ...messageState,
    sendMessage,
    deleteMessage,
    loadMore,
    refresh,
    clearError,
    markAsRead,
  };
}; 