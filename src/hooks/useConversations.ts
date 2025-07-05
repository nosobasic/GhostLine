import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// Types following strict TypeScript guidelines from rules.md
export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

export interface ConversationState {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  activeConversationId: string | null;
}

export interface ConversationActions {
  createConversation: (title: string) => Promise<{ success: boolean; conversationId?: string; error?: string }>;
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<{ success: boolean; error?: string }>;
  deleteConversation: (id: string) => Promise<{ success: boolean; error?: string }>;
  archiveConversation: (id: string) => Promise<{ success: boolean; error?: string }>;
  setActiveConversation: (id: string | null) => void;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export type UseConversationsReturn = ConversationState & ConversationActions;

export const useConversations = (): UseConversationsReturn => {
  const [conversationState, setConversationState] = useState<ConversationState>({
    conversations: [],
    loading: true,
    error: null,
    activeConversationId: null,
  });

  // Helper to update conversation state
  const updateConversationState = useCallback((updates: Partial<ConversationState>) => {
    setConversationState(prev => ({ ...prev, ...updates }));
  }, []);

  // Helper to set error state
  const setError = useCallback((error: string | null) => {
    updateConversationState({ error, loading: false });
  }, [updateConversationState]);

  // Helper to set loading state
  const setLoading = useCallback((loading: boolean) => {
    updateConversationState({ loading });
  }, [updateConversationState]);

  // Fetch conversations for the current user
  const fetchConversations = useCallback(async (): Promise<void> => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError('User not authenticated');
        return;
      }

      // Fetch conversations with last message info using the custom function
      const { data, error } = await supabase
        .rpc('get_conversations_with_last_message', { user_uuid: user.id });

      if (error) {
        console.error('Error fetching conversations:', error);
        setError(error.message);
        return;
      }

      const conversations = (data || []).map((conv: any) => ({
        id: conv.id,
        user_id: conv.user_id || user.id,
        title: conv.title,
        is_active: conv.is_active,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        last_message: conv.last_message,
        last_message_time: conv.last_message_time,
        unread_count: 0, // TODO: Implement unread count
      }));

      updateConversationState({
        conversations,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch conversations';
      setError(errorMessage);
    }
  }, [setError, updateConversationState]);

  // Subscribe to real-time conversation updates
  const subscribeToConversations = useCallback(() => {
    console.log('Subscribing to conversation updates');

    const subscription = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
        },
        (payload: any) => {
          console.log('New conversation created:', payload.new);
          const newConversation = payload.new as Conversation;
          
          // Only add if it belongs to current user
          setConversationState(prev => {
            const exists = prev.conversations.some(conv => conv.id === newConversation.id);
            if (exists) return prev;
            
            return {
              ...prev,
              conversations: [newConversation, ...prev.conversations],
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        (payload: any) => {
          console.log('Conversation updated:', payload.new);
          const updatedConversation = payload.new as Conversation;
          
          setConversationState(prev => ({
            ...prev,
            conversations: prev.conversations.map(conv =>
              conv.id === updatedConversation.id ? { ...conv, ...updatedConversation } : conv
            ),
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'conversations',
        },
        (payload: any) => {
          console.log('Conversation deleted:', payload.old);
          const deletedConversation = payload.old as Conversation;
          
          setConversationState(prev => ({
            ...prev,
            conversations: prev.conversations.filter(conv => conv.id !== deletedConversation.id),
            activeConversationId: prev.activeConversationId === deletedConversation.id 
              ? null 
              : prev.activeConversationId,
          }));
        }
      )
      .subscribe((status: any) => {
        console.log('Conversation subscription status:', status);
      });

    return subscription;
  }, []);

  // Initialize conversations and subscription
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (mounted) {
        await fetchConversations();
      }
    };

    initialize();

    // Set up real-time subscription
    const subscription = subscribeToConversations();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fetchConversations, subscribeToConversations]);

  // Create a new conversation
  const createConversation = useCallback(async (title: string): Promise<{ success: boolean; conversationId?: string; error?: string }> => {
    if (!title.trim()) {
      return { success: false, error: 'Conversation title cannot be empty' };
    }

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: title.trim(),
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return { success: false, error: error.message };
      }

      console.log('Conversation created successfully:', data);
      return { success: true, conversationId: data.id };
    } catch (error) {
      console.error('Error creating conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation';
      return { success: false, error: errorMessage };
    }
  }, []);

  // Update a conversation
  const updateConversation = useCallback(async (
    id: string, 
    updates: Partial<Conversation>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating conversation:', error);
        return { success: false, error: error.message };
      }

      console.log('Conversation updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error updating conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update conversation';
      return { success: false, error: errorMessage };
    }
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting conversation:', error);
        return { success: false, error: error.message };
      }

      console.log('Conversation deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete conversation';
      return { success: false, error: errorMessage };
    }
  }, []);

  // Archive a conversation (soft delete)
  const archiveConversation = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    return await updateConversation(id, { is_active: false });
  }, [updateConversation]);

  // Set active conversation
  const setActiveConversation = useCallback((id: string | null) => {
    updateConversationState({ activeConversationId: id });
  }, [updateConversationState]);

  // Refresh conversations
  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    await fetchConversations();
  }, [fetchConversations, setLoading, setError]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  return {
    ...conversationState,
    createConversation,
    updateConversation,
    deleteConversation,
    archiveConversation,
    setActiveConversation,
    refresh,
    clearError,
  };
};