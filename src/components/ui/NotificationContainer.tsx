import React from 'react';
import { Notification, NotificationType } from '../../hooks/useNotifications';

// Types following strict TypeScript guidelines from rules.md
interface NotificationContainerProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
  className?: string;
}

interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRemove }) => {
  const getNotificationStyles = (type: NotificationType) => {
    const baseStyles = "p-4 rounded-lg shadow-lg border-l-4 transition-all duration-300 ease-in-out";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-400 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-400 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-400 text-yellow-800`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-50 border-blue-400 text-blue-800`;
    }
  };

  const getIcon = (type: NotificationType) => {
    const iconClass = "w-5 h-5 mr-3 flex-shrink-0";
    
    switch (type) {
      case 'success':
        return (
          <svg className={`${iconClass} text-green-600`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className={`${iconClass} text-red-600`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={`${iconClass} text-yellow-600`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className={`${iconClass} text-blue-600`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div 
      className={`${getNotificationStyles(notification.type)} max-w-sm w-full transform transition-all duration-300 ease-in-out hover:translate-x-1`}
      role="alert"
    >
      <div className="flex items-start">
        {getIcon(notification.type)}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">
              {notification.title}
            </h4>
            
            <button
              onClick={() => onRemove(notification.id)}
              className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {notification.message && (
            <p className="mt-1 text-sm opacity-90">
              {notification.message}
            </p>
          )}
          
          {notification.action && (
            <div className="mt-3">
              <button
                onClick={notification.action.onClick}
                className="text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-sm"
              >
                {notification.action.label}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Progress bar for timed notifications */}
      {!notification.persistent && notification.duration && notification.duration > 0 && (
        <div className="mt-3 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
          <div 
            className="h-1 bg-current opacity-30 rounded-full animate-progress"
            style={{
              animationDuration: `${notification.duration}ms`,
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards'
            }}
          />
        </div>
      )}
    </div>
  );
};

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onRemove,
  className = ''
}) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-4 ${className}`}>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;