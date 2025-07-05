import React from 'react';
import { UserPresence } from '../../hooks/usePresence';

// Types following strict TypeScript guidelines from rules.md
interface PresenceIndicatorProps {
  user?: UserPresence;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  user,
  size = 'md',
  showText = false,
  className = ''
}) => {
  if (!user) {
    return null;
  }

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2';
      case 'lg':
        return 'w-4 h-4';
      case 'md':
      default:
        return 'w-3 h-3';
    }
  };

  // Get status color and style
  const getStatusStyles = () => {
    if (!user.isOnline) {
      return {
        color: 'bg-gray-400',
        text: 'Offline',
        textColor: 'text-gray-500'
      };
    }

    switch (user.status) {
      case 'online':
        return {
          color: 'bg-green-500',
          text: 'Online',
          textColor: 'text-green-600'
        };
      case 'away':
        return {
          color: 'bg-yellow-500',
          text: 'Away',
          textColor: 'text-yellow-600'
        };
      case 'busy':
        return {
          color: 'bg-red-500',
          text: 'Busy',
          textColor: 'text-red-600'
        };
      default:
        return {
          color: 'bg-gray-400',
          text: 'Offline',
          textColor: 'text-gray-500'
        };
    }
  };

  // Format last seen time
  const formatLastSeen = () => {
    if (user.isOnline) return null;
    
    const lastSeen = new Date(user.lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return lastSeen.toLocaleDateString();
    }
  };

  const statusStyles = getStatusStyles();
  const sizeClasses = getSizeClasses();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Status indicator dot */}
      <div className="relative">
        <div 
          className={`${sizeClasses} ${statusStyles.color} rounded-full ${
            user.isOnline && user.status === 'online' ? 'animate-pulse' : ''
          }`}
        />
        
        {/* Ring animation for online status */}
        {user.isOnline && user.status === 'online' && (
          <div 
            className={`absolute inset-0 ${sizeClasses} ${statusStyles.color} rounded-full animate-ping opacity-20`}
          />
        )}
      </div>

      {/* Status text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${statusStyles.textColor}`}>
            {statusStyles.text}
          </span>
          {!user.isOnline && (
            <span className="text-xs text-gray-400">
              {formatLastSeen()}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Component for showing multiple users' presence
interface MultiPresenceIndicatorProps {
  users: UserPresence[];
  maxDisplay?: number;
  className?: string;
}

export const MultiPresenceIndicator: React.FC<MultiPresenceIndicatorProps> = ({
  users,
  maxDisplay = 3,
  className = ''
}) => {
  const onlineUsers = users.filter(user => user.isOnline);
  const displayUsers = onlineUsers.slice(0, maxDisplay);
  const remainingCount = Math.max(0, onlineUsers.length - maxDisplay);

  if (onlineUsers.length === 0) {
    return (
      <div className={`flex items-center space-x-1 text-gray-500 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full" />
        <span className="text-xs">No one online</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Online count */}
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs text-green-600 font-medium">
          {onlineUsers.length} online
        </span>
      </div>

      {/* User avatars/dots */}
      {displayUsers.length > 0 && (
        <div className="flex -space-x-1">
          {displayUsers.map((user) => (
            <div
              key={user.userId}
              className="w-4 h-4 bg-green-500 rounded-full border border-white"
              title={`${user.userName} - ${user.status}`}
            />
          ))}
          {remainingCount > 0 && (
            <div 
              className="w-4 h-4 bg-gray-400 rounded-full border border-white flex items-center justify-center"
              title={`+${remainingCount} more online`}
            >
              <span className="text-xs text-white font-bold">
                +{remainingCount}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PresenceIndicator;