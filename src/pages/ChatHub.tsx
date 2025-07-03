import React, { useState } from 'react';
import ChatList from '../components/ChatList';
import Conversation from './Conversation';

interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  isActive: boolean;
}

const ChatHub: React.FC = () => {
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>();
  const [chats] = useState<Chat[]>([
    {
      id: '1',
      title: 'General Chat',
      lastMessage: 'Hello! How can I help you today?',
      timestamp: new Date(),
      isActive: true,
    },
    {
      id: '2',
      title: 'Voice Messages',
      lastMessage: 'Voice message received',
      timestamp: new Date(Date.now() - 60000),
      isActive: false,
    },
  ]);

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  return (
    <div className="flex h-screen bg-white">
      <div className="w-80 flex-shrink-0">
        <ChatList
          chats={chats}
          onChatSelect={handleChatSelect}
          selectedChatId={selectedChatId}
        />
      </div>
      <div className="flex-1">
        {selectedChatId ? (
          <Conversation chatId={selectedChatId} />
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
              <p className="text-gray-500">
                Select a conversation to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHub; 