import React, { useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMessages } from '../hooks/useMessages';
import { useTypingIndicator } from '../hooks/useTypingIndicator';
import { usePresence } from '../hooks/usePresence';
import { useNotifications } from '../hooks/useNotifications';
import { VoiceProfile } from '../hooks/useVoiceProfiles';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import TypingIndicator from '../components/chat/TypingIndicator';
import PresenceIndicator, { MultiPresenceIndicator } from '../components/ui/PresenceIndicator';
import NotificationContainer from '../components/ui/NotificationContainer';
import { PageLoadingSpinner } from '../components/ui/LoadingSpinner';
import { supabase } from '../lib/supabaseClient';

// Types following strict TypeScript guidelines from rules.md
interface ConversationProps {
  conversationId: string;
  activeVoiceProfile?: VoiceProfile | null;
}

const Conversation: React.FC<ConversationProps> = ({ 
  conversationId, 
  activeVoiceProfile 
}) => {
  const { user } = useAuth();
  const {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    loadMore,
    refresh,
    clearError
  } = useMessages(conversationId);

  // Real-time features
  const {
    typingUsers,
    setIsTyping
  } = useTypingIndicator(conversationId);

  const {
    onlineUsers,
    userStatuses,
    isOnline
  } = usePresence(conversationId);

  const {
    notifications,
    removeNotification,
    showSuccess,
    showError,
    showInfo
  } = useNotifications();

  // Handle voice message upload
  const handleUploadVoiceMessage = useCallback(async (audioBlob: Blob): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `voice-messages/${conversationId}-${timestamp}.wav`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, audioBlob, {
          contentType: 'audio/wav',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading voice message:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(data.path);

      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('Error uploading voice message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload voice message';
      return { success: false, error: errorMessage };
    }
  }, [conversationId]);

  // Handle message sending
  const handleSendMessage = useCallback(async (
    content: string,
    isVoice = false,
    audioUrl?: string,
    duration?: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await sendMessage(content, isVoice, audioUrl, duration);
      
      if (result.success) {
        // Show success notification for voice messages
        if (isVoice) {
          showSuccess('Voice message sent', 'Your voice message has been delivered successfully');
        }
      } else {
        // Show error notification
        showError('Failed to send message', result.error || 'Please try again');
      }
      
      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      showError('Failed to send message', errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [sendMessage, showSuccess, showError]);

  // Get conversation title (for now, use a simple format)
  const getConversationTitle = () => {
    return `Conversation`;
  };

  // Show loading state for initial load
  if (loading && messages.length === 0) {
    return <PageLoadingSpinner message="Loading conversation..." />;
  }

  // Show error state
  if (error && messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to load conversation</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-x-2">
              <button
                onClick={refresh}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Try again
              </button>
              <button
                onClick={clearError}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {getConversationTitle()}
            </h2>
            <div className="flex items-center space-x-3 mt-1">
              <p className="text-sm text-gray-500">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </p>
              <MultiPresenceIndicator users={onlineUsers} />
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Voice profile indicator */}
          {activeVoiceProfile && (
            <div className="flex items-center space-x-2 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">{activeVoiceProfile.name}</span>
            </div>
          )}
          
          {/* Refresh button */}
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded disabled:opacity-50"
            title="Refresh messages"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* User presence status */}
          <PresenceIndicator 
            user={isOnline ? { 
              userId: user?.id || '', 
              userName: 'You', 
              isOnline: true, 
              lastSeen: new Date().toISOString(), 
              status: 'online' 
            } : undefined} 
            showText={true}
            size="sm"
          />
        </div>
      </div>

      {/* Error notification */}
      {error && messages.length > 0 && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-red-700">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700 focus:outline-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <MessageList
        messages={messages}
        loading={loading}
        hasMore={hasMore}
        currentUserId={user?.id || ''}
        onLoadMore={loadMore}
        className="flex-1"
      />

      {/* Typing Indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onUploadVoiceMessage={handleUploadVoiceMessage}
        activeVoiceProfile={activeVoiceProfile}
        placeholder="Type your message..."
        onTypingStart={() => setIsTyping(true)}
        onTypingStop={() => setIsTyping(false)}
      />

      {/* Notification Container */}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
};

export default Conversation; 