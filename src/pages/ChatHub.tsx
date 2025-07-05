import React, { useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useConversations } from '../hooks/useConversations';
import { useVoiceProfiles } from '../hooks/useVoiceProfiles';
import { PageLoadingSpinner } from '../components/ui/LoadingSpinner';
import Conversation from './Conversation';

// Updated ChatList component with real data
interface ChatListProps {
  conversations: any[];
  onChatSelect: (chatId: string) => void;
  onCreateChat: () => void;
  selectedChatId?: string;
  loading: boolean;
  onRefresh: () => void;
}

const ChatList: React.FC<ChatListProps> = ({ 
  conversations, 
  onChatSelect, 
  onCreateChat,
  selectedChatId, 
  loading,
  onRefresh 
}) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="w-full h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Conversations</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded disabled:opacity-50"
              title="Refresh conversations"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onCreateChat}
              className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="New conversation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
            <p className="text-gray-500 mb-4">Start your first conversation to begin messaging</p>
            <button
              onClick={onCreateChat}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${
                selectedChatId === conversation.id ? 'bg-indigo-50 border-indigo-200' : ''
              }`}
              onClick={() => onChatSelect(conversation.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {conversation.title}
                  </h3>
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {conversation.last_message || 'No messages yet'}
                  </p>
                </div>
                <div className="flex flex-col items-end ml-2">
                  <span className="text-xs text-gray-400">
                    {conversation.last_message_time ? formatTime(conversation.last_message_time) : formatTime(conversation.created_at)}
                  </span>
                  {conversation.is_active && (
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1"></div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ChatHub: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { 
    conversations, 
    loading: conversationsLoading, 
    error: conversationsError,
    activeConversationId,
    setActiveConversation,
    createConversation,
    refresh: refreshConversations
  } = useConversations();
  
  const { 
    activeProfile: activeVoiceProfile,
    loading: voiceProfilesLoading 
  } = useVoiceProfiles();

  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // Handle conversation selection
  const handleChatSelect = useCallback((chatId: string) => {
    setActiveConversation(chatId);
  }, [setActiveConversation]);

  // Handle new conversation creation
  const handleCreateConversation = useCallback(async () => {
    if (isCreatingConversation) return;

    const title = prompt('Enter conversation title:');
    if (!title?.trim()) return;

    setIsCreatingConversation(true);
    
    try {
      const result = await createConversation(title.trim());
      if (result.success && result.conversationId) {
        setActiveConversation(result.conversationId);
      } else {
        alert(result.error || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Failed to create conversation');
    } finally {
      setIsCreatingConversation(false);
    }
  }, [isCreatingConversation, createConversation, setActiveConversation]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await refreshConversations();
  }, [refreshConversations]);

  // Show loading state while auth is loading
  if (authLoading) {
    return <PageLoadingSpinner message="Loading GhostLine..." />;
  }

  // Show error state
  if (conversationsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{conversationsError}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0">
        <ChatList
          conversations={conversations}
          onChatSelect={handleChatSelect}
          onCreateChat={handleCreateConversation}
          selectedChatId={activeConversationId || undefined}
          loading={conversationsLoading || isCreatingConversation}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Main content */}
      <div className="flex-1">
        {activeConversationId ? (
          <Conversation 
            conversationId={activeConversationId} 
            activeVoiceProfile={activeVoiceProfile}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                <svg viewBox="0 0 64 64" fill="currentColor">
                  <path d="M32 8C20.954 8 12 16.954 12 28v8c0 11.046 8.954 20 20 20s20-8.954 20-20v-8C52 16.954 43.046 8 32 8z"/>
                  <circle cx="24" cy="32" r="3" fill="white"/>
                  <circle cx="40" cy="32" r="3" fill="white"/>
                  <path d="M32 44c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z" fill="white"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to GhostLine
              </h3>
              <p className="text-gray-500 mb-4">
                Select a conversation to start chatting
              </p>
              {voiceProfilesLoading ? (
                <p className="text-sm text-gray-400">Loading voice profiles...</p>
              ) : activeVoiceProfile ? (
                <div className="text-sm text-indigo-600">
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                    Active voice profile: {activeVoiceProfile.name}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No voice profile selected</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHub; 