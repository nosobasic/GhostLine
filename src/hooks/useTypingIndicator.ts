import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

// Types following strict TypeScript guidelines from rules.md
export interface TypingUser {
  userId: string;
  userName: string;
  timestamp: string;
}

export interface TypingIndicatorState {
  typingUsers: TypingUser[];
  isTyping: boolean;
}

export interface TypingIndicatorActions {
  startTyping: () => void;
  stopTyping: () => void;
  setIsTyping: (typing: boolean) => void;
}

export type UseTypingIndicatorReturn = TypingIndicatorState & TypingIndicatorActions;

export const useTypingIndicator = (conversationId: string): UseTypingIndicatorReturn => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTypingState] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingTimeRef = useRef<number>(0);
  const channelRef = useRef<any>(null);

  // Get current user info
  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }, []);

  // Clean up typing timeout
  const clearTypingTimeout = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  // Send typing status to other users
  const sendTypingStatus = useCallback(async (typing: boolean) => {
    try {
      const user = await getCurrentUser();
      if (!user || !channelRef.current) return;

      const payload = {
        userId: user.id,
        userName: (user as any)?.user_metadata?.full_name || user.email || 'User',
        conversationId,
        isTyping: typing,
        timestamp: new Date().toISOString()
      };

      // Send typing status via channel
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload
      });
    } catch (error) {
      console.error('Error sending typing status:', error);
    }
  }, [conversationId, getCurrentUser]);

  // Start typing indicator
  const startTyping = useCallback(async () => {
    const now = Date.now();
    lastTypingTimeRef.current = now;

    if (!isTyping) {
      setIsTypingState(true);
      await sendTypingStatus(true);
    }

    // Clear existing timeout
    clearTypingTimeout();

    // Set timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTypingState(false);
      await sendTypingStatus(false);
    }, 3000);
  }, [isTyping, sendTypingStatus, clearTypingTimeout]);

  // Stop typing indicator
  const stopTyping = useCallback(async () => {
    clearTypingTimeout();
    
    if (isTyping) {
      setIsTypingState(false);
      await sendTypingStatus(false);
    }
  }, [isTyping, sendTypingStatus, clearTypingTimeout]);

  // Set typing state
  const setIsTyping = useCallback((typing: boolean) => {
    if (typing) {
      startTyping();
    } else {
      stopTyping();
    }
  }, [startTyping, stopTyping]);

  // Initialize real-time channel and subscribe to typing events
  useEffect(() => {
    if (!conversationId) return;

    // Create channel for this conversation
    const channel = supabase.channel(`typing:${conversationId}`, {
      config: {
        broadcast: { self: false }
      }
    });

    channelRef.current = channel;

    // Subscribe to typing events
    channel
      .on('broadcast', { event: 'typing' }, async (payload: any) => {
        const typingData = payload.payload;
        const currentUser = await getCurrentUser();
        
        // Don't show own typing indicator
        if (typingData.userId === currentUser?.id) return;

        setTypingUsers(prev => {
          const filtered = prev.filter(user => user.userId !== typingData.userId);
          
          if (typingData.isTyping) {
            return [...filtered, {
              userId: typingData.userId,
              userName: typingData.userName,
              timestamp: typingData.timestamp
            }];
          } else {
            return filtered;
          }
        });
      })
      .subscribe((status: any) => {
        console.log('Typing indicator subscription status:', status);
      });

    return () => {
      // Clean up on unmount
      stopTyping();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, getCurrentUser, stopTyping]);

  // Clean up stale typing indicators (remove users who haven't typed in 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      setTypingUsers(prev => 
        prev.filter(user => {
          const userTime = new Date(user.timestamp).getTime();
          return now - userTime < 5000; // 5 seconds
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTypingTimeout();
      stopTyping();
    };
  }, [clearTypingTimeout, stopTyping]);

  return {
    typingUsers,
    isTyping,
    startTyping,
    stopTyping,
    setIsTyping
  };
};