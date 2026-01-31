import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  onAction?: (action: string, content: string) => void;
  onUseAsPrompt?: (content: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onAction, onUseAsPrompt }) => {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<any>(null);
  const isUser = message.role === 'user';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setShowMenu(false);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLongPress = (e: React.PointerEvent) => {
    if (message.status === 'sending') return;
    longPressTimer.current = setTimeout(() => {
      setShowMenu(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const menuActions = [
    { label: 'Copy Message', icon: '📋', action: handleCopy },
    { label: 'Shorten', icon: '📉', action: () => onAction?.('Shorten this', message.content) },
    { label: 'Expand', icon: '📈', action: () => onAction?.('Expand on this', message.content) },
    { label: 'Professional Tone', icon: '👔', action: () => onAction?.('Rewrite this in a professional tone', message.content) },
    { label: 'Casual Tone', icon: '👟', action: () => onAction?.('Rewrite this in a casual tone', message.content) },
  ];

  return (
    <div className={`flex w-full mb-4 group ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`relative flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          onPointerDown={handleLongPress}
          onPointerUp={cancelLongPress}
          onPointerLeave={cancelLongPress}
          onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
          className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.98] ${isUser
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
            {message.role === 'assistant' && message.status === 'sent' && (
              <button
                onClick={(e) => { e.stopPropagation(); onUseAsPrompt?.(message.content); }}
                className="text-[10px] font-semibold text-[#007AFF] hover:opacity-70 active:scale-95 transition-all"
              >
                Use as Prompt
              </button>
            )}
          </div>
        </div>

        {showMenu && (
          <div
            ref={menuRef}
            className={`absolute z-[100] w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-200 py-1.5 animate-in fade-in zoom-in duration-150 ${isUser ? 'right-0 top-1/2' : 'left-0 top-1/2'
              }`}
          >
            {menuActions.map((item, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); item.action(); setShowMenu(false); }}
                className="w-full px-4 py-2.5 text-left text-[14px] font-medium text-zinc-800 hover:bg-zinc-100 flex items-center space-x-3 active:bg-zinc-200 transition-colors"
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {copied && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800/90 text-white text-[10px] px-3 py-1 rounded-full animate-in fade-in slide-in-from-bottom-1 z-[110]">
            Copied to Clipboard
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
