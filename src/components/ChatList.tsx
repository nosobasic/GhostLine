import React from 'react';

interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  isActive: boolean;
}

interface ChatListProps {
  chats: Chat[];
  onChatSelect: (chatId: string) => void;
  selectedChatId?: string;
}

const ChatList: React.FC<ChatListProps> = ({ chats, onChatSelect, selectedChatId }) => {
  return (
    <div className="w-full h-full bg-gray-50 border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Conversations</h2>
      </div>
      <div className="overflow-y-auto h-full">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${
              selectedChatId === chat.id ? 'bg-indigo-50 border-indigo-200' : ''
            }`}
            onClick={() => onChatSelect(chat.id)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {chat.title}
                </h3>
                <p className="text-sm text-gray-500 truncate mt-1">
                  {chat.lastMessage}
                </p>
              </div>
              <div className="flex flex-col items-end ml-2">
                <span className="text-xs text-gray-400">
                  {chat.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {chat.isActive && (
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1"></div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatList; 