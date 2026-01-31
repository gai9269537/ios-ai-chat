import React, { useState } from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex w-full mb-4 group ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`relative flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all duration-200 ${isUser
              ? 'bg-[#007AFF] text-white rounded-tr-none ml-12'
              : 'bg-white border border-zinc-100 text-black rounded-tl-none mr-12'
            }`}
        >
          <div className="whitespace-pre-wrap break-words">
            {message.content}
            {message.status === 'sending' && (
              <span className="inline-block ml-1 animate-pulse">...</span>
            )}
          </div>

          <div className="flex items-center justify-between mt-1 space-x-4">
            <span className={`text-[10px] opacity-60 ${isUser ? 'text-white/80' : 'text-zinc-400'}`}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>

            <button
              onClick={handleCopy}
              className={`p-1 rounded-md transition-all active:scale-95 ${isUser ? 'hover:bg-white/10 text-white/70' : 'hover:bg-zinc-100 text-zinc-400'
                }`}
              title="Copy to clipboard"
            >
              {copied ? (
                <span className="text-[10px] font-bold uppercase tracking-wider">Copied!</span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
