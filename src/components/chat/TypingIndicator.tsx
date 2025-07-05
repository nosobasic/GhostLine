import React from 'react';
import { TypingUser } from '../../hooks/useTypingIndicator';

// Types following strict TypeScript guidelines from rules.md
interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers, className = '' }) => {
  if (typingUsers.length === 0) {
    return null;
  }

  // Format typing users display text
  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`;
    } else if (typingUsers.length === 3) {
      return `${typingUsers[0].userName}, ${typingUsers[1].userName}, and ${typingUsers[2].userName} are typing...`;
    } else {
      return `${typingUsers[0].userName}, ${typingUsers[1].userName}, and ${typingUsers.length - 2} others are typing...`;
    }
  };

  return (
    <div className={`flex items-center space-x-2 px-4 py-2 text-sm text-gray-500 ${className}`}>
      {/* Animated typing dots */}
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      
      {/* Typing text */}
      <span className="text-sm italic">
        {getTypingText()}
      </span>
    </div>
  );
};

export default TypingIndicator;