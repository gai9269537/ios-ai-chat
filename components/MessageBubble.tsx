
import React from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all duration-200 ${
          isUser
            ? 'bg-[#007AFF] text-white rounded-tr-none ml-12'
            : 'bg-[#E9E9EB] text-black rounded-tl-none mr-12'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content}
          {message.status === 'sending' && (
            <span className="inline-block ml-1 animate-pulse">...</span>
          )}
        </div>
        <div
          className={`text-[10px] mt-1 opacity-60 ${
            isUser ? 'text-right' : 'text-left'
          }`}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
