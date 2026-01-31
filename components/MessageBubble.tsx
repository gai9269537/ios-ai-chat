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
    <div className={`flex w-full mb-5 group ${isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
      <div className={`relative flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          onPointerDown={handleLongPress}
          onPointerUp={cancelLongPress}
          onPointerLeave={cancelLongPress}
          onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
          className={`px-5 py-3 rounded-[24px] text-[15.5px] font-medium leading-[1.45] shadow-sm transition-all duration-300 cursor-pointer active:scale-[0.98] ${isUser
            ? 'bg-gradient-to-tr from-[#007AFF] to-[#00C6FF] text-white rounded-tr-none ml-10 shadow-blue-500/10'
            : 'bg-white border border-white text-zinc-800 rounded-tl-none mr-10 shadow-sm'
            }`}
        >
          <div className="whitespace-pre-wrap break-words">
            {message.content}
            {message.status === 'sending' && (
              <span className="inline-flex ml-1.5 space-x-0.5">
                <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-duration:1s]"></span>
                <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.2s]"></span>
                <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.4s]"></span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-1.5 pt-1 space-x-6 border-t border-white/10">
            <span className={`text-[10px] font-bold tracking-tight ${isUser ? 'text-white/60' : 'text-zinc-400'}`}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {message.role === 'assistant' && message.status === 'sent' && (
              <button
                onClick={(e) => { e.stopPropagation(); onUseAsPrompt?.(message.content); }}
                className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 active:scale-90 transition-all"
              >
                Use as Prompt
              </button>
            )}
          </div>
        </div>

        {showMenu && (
          <div
            ref={menuRef}
            className={`absolute z-[100] w-64 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-zinc-200 py-2.5 animate-in zoom-in-95 fade-in duration-200 ${isUser ? 'right-0 top-1/2 -translate-y-1/2' : 'left-0 top-1/2 -translate-y-1/2'
              }`}
          >
            <div className="px-5 py-1.5 mb-1 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Message Actions</div>
            {menuActions.map((item, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); item.action(); setShowMenu(false); }}
                className="w-full px-5 py-3 text-left text-[14.5px] font-bold text-zinc-800 hover:bg-blue-50 hover:text-blue-600 flex items-center space-x-4 active:bg-blue-100 transition-all"
              >
                <span className="text-xl opacity-80">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {copied && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-md text-white text-[11px] font-bold px-4 py-1.5 rounded-full animate-in slide-in-from-bottom-2 duration-300 z-[110] shadow-xl">
            Copied to Clipboard
          </div>
        )}
      </div>
    </div>

  );
};

export default MessageBubble;
