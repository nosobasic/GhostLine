import React, { useRef, useEffect, useCallback } from 'react';
import { Message } from '../../hooks/useMessages';
import AudioPlayer from '../voice/AudioPlayer';
import { InlineLoadingSpinner } from '../ui/LoadingSpinner';

// Types following strict TypeScript guidelines from rules.md
interface MessageListProps {
  messages: Message[];
  loading: boolean;
  hasMore: boolean;
  currentUserId: string;
  onLoadMore: () => void;
  className?: string;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showTimestamp?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isOwn, 
  showTimestamp = false 
}) => {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : 'order-2'}`}>
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-indigo-600 text-white rounded-br-md'
              : 'bg-gray-200 text-gray-900 rounded-bl-md'
          }`}
        >
          {message.is_voice && message.audio_url ? (
            <div className="space-y-2">
              <div className={`flex items-center space-x-2 ${isOwn ? 'text-indigo-100' : 'text-gray-600'}`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Voice message</span>
                {message.duration && (
                  <span className="text-xs opacity-75">
                    {Math.floor(message.duration / 60)}:{(message.duration % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
              <AudioPlayer 
                audioUrl={message.audio_url}
                duration={message.duration || undefined}
                className="w-full"
              />
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
        </div>
        
        {showTimestamp && (
          <p className={`text-xs mt-1 ${isOwn ? 'text-right text-gray-500' : 'text-left text-gray-500'}`}>
            {formatTimestamp(message.created_at)}
          </p>
        )}
      </div>
    </div>
  );
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading,
  hasMore,
  currentUserId,
  onLoadMore,
  className = ''
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Handle scroll for load more functionality
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || !hasMore || loading) return;

    // Check if scrolled to top for loading more messages
    if (container.scrollTop === 0) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  // Intersection observer for load more trigger
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Only auto-scroll if user is near the bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Group messages by date for better UX
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentGroup: { date: string; messages: Message[] } | null = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.created_at).toDateString();
      
      if (!currentGroup || currentGroup.date !== messageDate) {
        currentGroup = { date: messageDate, messages: [message] };
        groups.push(currentGroup);
      } else {
        currentGroup.messages.push(message);
      }
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (dateString === today) return 'Today';
    if (dateString === yesterday) return 'Yesterday';
    
    return date.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (messages.length === 0 && !loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm">Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={messagesContainerRef}
      className={`flex-1 overflow-y-auto px-4 py-6 ${className}`}
      onScroll={handleScroll}
    >
      {/* Load more indicator */}
      {hasMore && (
        <div ref={loadingRef} className="flex justify-center py-4">
          {loading ? (
            <InlineLoadingSpinner message="Loading more messages..." />
          ) : (
            <button
              onClick={onLoadMore}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Load more messages
            </button>
          )}
        </div>
      )}

      {/* Message groups */}
      {messageGroups.map((group) => (
        <div key={group.date}>
          {/* Date header */}
          <div className="flex justify-center my-6">
            <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
              {formatDateHeader(group.date)}
            </span>
          </div>

          {/* Messages for this date */}
          {group.messages.map((message, index) => {
            const isOwn = message.user_id === currentUserId;
            const isLast = index === group.messages.length - 1;
            const showTimestamp = isLast || 
              (index < group.messages.length - 1 && 
                new Date(message.created_at).getTime() - 
                new Date(group.messages[index + 1].created_at).getTime() > 300000); // 5 minutes

            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={isOwn}
                showTimestamp={showTimestamp}
              />
            );
          })}
        </div>
      ))}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;