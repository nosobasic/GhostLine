import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from '../components/MessageBubble';
import VoiceRecorder from '../components/VoiceRecorder';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
  isVoice?: boolean;
  duration?: number;
}

interface ConversationProps {
  chatId: string;
}

const Conversation: React.FC<ConversationProps> = ({ chatId }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! Welcome to GhostLine. How can I assist you today?',
      timestamp: new Date(Date.now() - 300000),
      isUser: false,
    },
    {
      id: '2',
      content: 'Hi! I\'d like to know more about voice messaging features.',
      timestamp: new Date(Date.now() - 240000),
      isUser: true,
    },
    {
      id: '3',
      content: 'Voice messaging is one of our key features. You can record and send voice messages, and they\'ll be processed for better communication.',
      timestamp: new Date(Date.now() - 180000),
      isUser: false,
    },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        content: newMessage,
        timestamp: new Date(),
        isUser: true,
      };
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // Simulate AI response
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: 'Thanks for your message! I\'m here to help with any questions you have about GhostLine.',
          timestamp: new Date(),
          isUser: false,
        };
        setMessages(prev => [...prev, aiResponse]);
      }, 1000);
    }
  };

  const handleVoiceRecordingComplete = (audioBlob: Blob, duration: number) => {
    const voiceMessage: Message = {
      id: Date.now().toString(),
      content: 'Voice message',
      timestamp: new Date(),
      isUser: true,
      isVoice: true,
      duration,
    };
    setMessages(prev => [...prev, voiceMessage]);
    
    // Simulate AI voice response
    setTimeout(() => {
      const aiVoiceResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Voice response received',
        timestamp: new Date(),
        isUser: false,
        isVoice: true,
        duration: 3,
      };
      setMessages(prev => [...prev, aiVoiceResponse]);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Chat #{chatId}</h2>
          <p className="text-sm text-gray-500">Active now</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-500">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={1}
            />
          </div>
          <div className="flex items-center space-x-2">
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecordingComplete}
              isRecording={isRecording}
              onStartRecording={() => setIsRecording(true)}
              onStopRecording={() => setIsRecording(false)}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Conversation; 