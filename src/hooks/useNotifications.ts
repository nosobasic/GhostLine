import { useState, useCallback, useRef } from 'react';

// Types following strict TypeScript guidelines from rules.md
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

export interface NotificationState {
  notifications: Notification[];
}

export interface NotificationActions {
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  showSuccess: (title: string, message?: string, duration?: number) => string;
  showError: (title: string, message?: string, duration?: number) => string;
  showWarning: (title: string, message?: string, duration?: number) => string;
  showInfo: (title: string, message?: string, duration?: number) => string;
}

export type UseNotificationsReturn = NotificationState & NotificationActions;

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Generate unique ID for notifications
  const generateId = useCallback(() => {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Remove notification by ID
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    
    // Clear timeout if exists
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  // Add notification
  const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'createdAt'>) => {
    const id = generateId();
    const notification: Notification = {
      ...notificationData,
      id,
      createdAt: Date.now(),
      duration: notificationData.duration ?? 5000, // Default 5 seconds
    };

    setNotifications(prev => [notification, ...prev]);

    // Auto-remove notification after duration (unless persistent)
    if (!notification.persistent && notification.duration && notification.duration > 0) {
      const timeout = setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
      
      timeoutsRef.current.set(id, timeout);
    }

    return id;
  }, [generateId, removeNotification]);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();
    
    setNotifications([]);
  }, []);

  // Convenience methods for different notification types
  const showSuccess = useCallback((title: string, message?: string, duration?: number) => {
    return addNotification({
      type: 'success',
      title,
      message,
      duration
    });
  }, [addNotification]);

  const showError = useCallback((title: string, message?: string, duration?: number) => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration: duration ?? 8000 // Errors stay longer
    });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message?: string, duration?: number) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      duration
    });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message?: string, duration?: number) => {
    return addNotification({
      type: 'info',
      title,
      message,
      duration
    });
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};