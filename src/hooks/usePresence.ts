import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

// Types following strict TypeScript guidelines from rules.md
export interface UserPresence {
  userId: string;
  userName: string;
  isOnline: boolean;
  lastSeen: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

export interface PresenceState {
  onlineUsers: UserPresence[];
  userStatuses: Map<string, UserPresence>;
  isOnline: boolean;
}

export interface PresenceActions {
  updatePresence: (status: UserPresence['status']) => void;
  goOnline: () => void;
  goOffline: () => void;
  setUserStatus: (status: UserPresence['status']) => void;
}

export type UsePresenceReturn = PresenceState & PresenceActions;

export const usePresence = (conversationId?: string): UsePresenceReturn => {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [userStatuses, setUserStatuses] = useState<Map<string, UserPresence>>(new Map());
  const [isOnline, setIsOnline] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<UserPresence['status']>('online');
  
  const channelRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current user info
  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }, []);

  // Send presence update
  const sendPresenceUpdate = useCallback(async (status: UserPresence['status'] = 'online', isOnline = true) => {
    try {
      const user = await getCurrentUser();
      if (!user || !channelRef.current) return;

      const presenceData: UserPresence = {
        userId: user.id,
        userName: (user as any)?.user_metadata?.full_name || user.email || 'User',
        isOnline,
        lastSeen: new Date().toISOString(),
        status
      };

      // Send presence via channel
      channelRef.current.send({
        type: 'broadcast',
        event: 'presence',
        payload: presenceData
      });

      // Update local status
      setCurrentStatus(status);
      setIsOnline(isOnline);
    } catch (error) {
      console.error('Error sending presence update:', error);
    }
  }, [getCurrentUser]);

  // Update presence status
  const updatePresence = useCallback((status: UserPresence['status']) => {
    sendPresenceUpdate(status, true);
  }, [sendPresenceUpdate]);

  // Go online
  const goOnline = useCallback(() => {
    sendPresenceUpdate('online', true);
  }, [sendPresenceUpdate]);

  // Go offline
  const goOffline = useCallback(() => {
    sendPresenceUpdate('offline', false);
  }, [sendPresenceUpdate]);

  // Set user status
  const setUserStatus = useCallback((status: UserPresence['status']) => {
    updatePresence(status);
  }, [updatePresence]);

  // Start heartbeat to maintain presence
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (isOnline) {
        sendPresenceUpdate(currentStatus, true);
      }
    }, 30000); // Send heartbeat every 30 seconds
  }, [isOnline, currentStatus, sendPresenceUpdate]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Handle visibility change (tab focus/blur)
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Tab is not visible, set to away after 5 minutes
      presenceTimeoutRef.current = setTimeout(() => {
        sendPresenceUpdate('away', true);
      }, 300000); // 5 minutes
    } else {
      // Tab is visible, cancel away timeout and go online
      if (presenceTimeoutRef.current) {
        clearTimeout(presenceTimeoutRef.current);
        presenceTimeoutRef.current = null;
      }
      sendPresenceUpdate('online', true);
    }
  }, [sendPresenceUpdate]);

  // Initialize presence system
  useEffect(() => {
    const channel = supabase.channel(`presence${conversationId ? `:${conversationId}` : ':global'}`, {
      config: {
        broadcast: { self: false }
      }
    });

    channelRef.current = channel;

    // Subscribe to presence events
    channel
      .on('broadcast', { event: 'presence' }, async (payload: any) => {
        const presenceData: UserPresence = payload.payload;
        const currentUser = await getCurrentUser();
        
        // Don't process own presence updates
        if (presenceData.userId === currentUser?.id) return;

        setUserStatuses(prev => {
          const newMap = new Map(prev);
          
          if (presenceData.isOnline) {
            newMap.set(presenceData.userId, presenceData);
          } else {
            // Mark as offline but keep the record with last seen
            const existing = newMap.get(presenceData.userId);
            if (existing) {
              newMap.set(presenceData.userId, {
                ...existing,
                isOnline: false,
                lastSeen: presenceData.lastSeen,
                status: 'offline'
              });
            }
          }
          
          return newMap;
        });

        // Update online users list
        setOnlineUsers(prev => {
          const filtered = prev.filter(user => user.userId !== presenceData.userId);
          
          if (presenceData.isOnline) {
            return [...filtered, presenceData];
          } else {
            return filtered;
          }
        });
      })
      .subscribe((status: any) => {
        console.log('Presence subscription status:', status);
      });

    // Send initial presence
    goOnline();
    startHeartbeat();

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Add beforeunload listener to send offline status
    const handleBeforeUnload = () => {
      goOffline();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Clean up
      stopHeartbeat();
      goOffline();
      
      if (presenceTimeoutRef.current) {
        clearTimeout(presenceTimeoutRef.current);
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, getCurrentUser, goOnline, goOffline, startHeartbeat, stopHeartbeat, handleVisibilityChange]);

  // Clean up stale presence data (remove users offline for more than 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const fiveMinutesAgo = now - 300000; // 5 minutes

      setUserStatuses(prev => {
        const newMap = new Map(prev);
        
        for (const [userId, user] of Array.from(newMap.entries())) {
          const lastSeenTime = new Date(user.lastSeen).getTime();
          if (!user.isOnline && lastSeenTime < fiveMinutesAgo) {
            newMap.delete(userId);
          }
        }
        
        return newMap;
      });

      setOnlineUsers(prev => 
        prev.filter(user => {
          const lastSeenTime = new Date(user.lastSeen).getTime();
          return user.isOnline || lastSeenTime >= fiveMinutesAgo;
        })
      );
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return {
    onlineUsers,
    userStatuses,
    isOnline,
    updatePresence,
    goOnline,
    goOffline,
    setUserStatus
  };
};