
import React, { useState, useRef, useEffect, useMemo } from 'react';
import StatusBar from './components/StatusBar';
import MessageBubble from './components/MessageBubble';
import { Message, ChatSession, ModelName } from './types';
import { getGeminiResponse, summarizeChat } from './services/gemini';
import { isUsageLimitReached, incrementUsage, getRemainingMessages } from './services/usage';

const STORAGE_KEY = 'ios_ai_chat_sessions_v1';
const MODEL_STORAGE_KEY = 'ios_ai_chat_selected_model';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelName>(ModelName.GEMINI_FLASH);
  const [chatSummary, setChatSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setInputValue(transcript);
      };
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const revived = parsed.map((s: any) => ({
          ...s,
          lastUpdated: new Date(s.lastUpdated),
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
        setSessions(revived);
      } catch (e) { console.error(e); }
    }
    const savedModel = localStorage.getItem(MODEL_STORAGE_KEY) as ModelName;
    if (savedModel && Object.values(ModelName).includes(savedModel)) setSelectedModel(savedModel);
  }, []);

  useEffect(() => {
    if (sessions.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
  }, [selectedModel]);

  const currentSession = useMemo(() =>
    sessions.find(s => s.id === currentSessionId),
    [sessions, currentSessionId]
  );

  const messages = currentSession?.messages || [];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, currentSessionId]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      lastUpdated: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const messageText = customPrompt || inputValue;
    if (!messageText.trim() || isLoading || !currentSessionId) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: messageText, timestamp: new Date(), status: 'sent' };
    const assistantId = (Date.now() + 1).toString();
    const assistantPlaceholder: Message = { id: assistantId, role: 'assistant', content: '', timestamp: new Date(), status: 'sending' };

    if (!customPrompt) setInputValue('');
    setIsLoading(true);

    let updatedTitle = currentSession?.title;
    if (messages.length === 0) updatedTitle = messageText.length > 30 ? messageText.substring(0, 30) + '...' : messageText;

    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title: updatedTitle || s.title, lastUpdated: new Date(), messages: [...s.messages, userMessage, assistantPlaceholder] } : s));

    if (isUsageLimitReached()) {
      alert("Daily free limit reached. We are keeping it free for now by limiting daily usage. Please come back tomorrow!");
      setIsLoading(false);
      return;
    }

    try {
      let accumulated = "";
      await getGeminiResponse(messageText, selectedModel, [], (chunk) => {
        accumulated += chunk;
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: s.messages.map(msg => msg.id === assistantId ? { ...msg, content: accumulated } : msg) } : s));
      });
      incrementUsage();
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: s.messages.map(msg => msg.id === assistantId ? { ...msg, status: 'sent' } : msg) } : s));
    } catch (error) {
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: s.messages.map(msg => msg.id === assistantId ? { ...msg, content: "Error communicating with AI.", status: 'error' } : msg) } : s));
    } finally { setIsLoading(false); }
  };

  const handleSummarize = async () => {
    if (!currentSession || messages.length === 0) return;
    setIsSummarizing(true);
    setShowModelMenu(false);
    try {
      const summary = await summarizeChat(messages, selectedModel);
      setChatSummary(summary);
    } catch (e) {
      console.error(e);
      alert("Failed to generate summary.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const exportChat = (format: 'txt' | 'yaml') => {
    if (!currentSession || currentSession.messages.length === 0) return;
    let content = "";
    if (format === 'txt') {
      content = currentSession.messages.map(m => `[${m.timestamp.toLocaleString()}] ${m.role.toUpperCase()}:\n${m.content}\n${'-'.repeat(40)}`).join('\n\n');
    } else {
      content = `session:\n  id: ${currentSession.id}\n  title: "${currentSession.title}"\nmessages:\n` +
        currentSession.messages.map(m => `  - role: ${m.role}\n    content: "${m.content.replace(/"/g, '\\"')}"`).join('\n');
    }
    const blob = new Blob([content], { type: format === 'txt' ? 'text/plain' : 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-${currentSession.title.replace(/[^a-z0-9]/gi, '-')}.${format}`;
    link.click();
    setShowExportMenu(false);
  };

  const exportSummary = (format: 'txt' | 'yaml') => {
    if (!chatSummary || !currentSession) return;
    let content = "";
    if (format === 'txt') {
      content = `SUMMARY OF: ${currentSession.title}\nDate: ${new Date().toLocaleString()}\n${'='.repeat(40)}\n\n${chatSummary}`;
    } else {
      content = `summary:\n  chat_title: "${currentSession.title.replace(/"/g, '\\"')}"\n  content: "${chatSummary.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"\n  date: "${new Date().toISOString()}"`;
    }
    const blob = new Blob([content], { type: format === 'txt' ? 'text/plain' : 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `summary-${currentSession.title.replace(/[^a-z0-9]/gi, '-')}.${format}`;
    link.click();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-100 p-0 sm:p-4">
      <div className="relative w-full h-screen sm:h-[844px] sm:w-[390px] bg-white sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border-[8px] border-zinc-900 sm:border-[12px]">
        <StatusBar />

        {!currentSessionId ? (
          <div className="flex flex-col h-full bg-white">
            <div className="px-6 pt-10 pb-4">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Messages</h1>
                <div className="flex items-center space-x-2">
                  <button onClick={createNewSession} className="text-[#007AFF] bg-[#007AFF]/10 p-2 rounded-full active:scale-90 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sessions.map(s => (
                <div key={s.id} onClick={() => setCurrentSessionId(s.id)} className="px-6 py-4 flex items-center space-x-4 active:bg-zinc-50 cursor-pointer group border-b border-zinc-50">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-zinc-200 to-zinc-300 flex-shrink-0 flex items-center justify-center text-white font-bold">{s.title.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5"><h3 className="font-semibold text-[15px] truncate">{s.title}</h3><span className="text-[12px] text-zinc-400">{s.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                    <p className="text-[13px] text-zinc-500 truncate">{s.messages.length > 0 ? s.messages[s.messages.length - 1].content : 'No messages yet'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between bg-white/90 ios-blur z-40 sticky top-0">
              <div className="flex items-center">
                <button onClick={() => setCurrentSessionId(null)} className="mr-3 text-[#007AFF] flex items-center"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
                <div className="flex flex-col">
                  <h1 className="font-semibold text-[15px] text-black truncate max-w-[120px] leading-tight">{currentSession?.title}</h1>
                  <span className="text-[10px] text-zinc-500 font-medium">{selectedModel === ModelName.GEMINI_PRO ? 'Pro' : 'Flash'}</span>
                </div>
              </div>
              <div className="flex space-x-3 relative">
                <div ref={exportMenuRef}>
                  <button onClick={() => setShowExportMenu(!showExportMenu)} className="text-[#007AFF] p-1.5"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                  {showExportMenu && (
                    <div className="absolute right-0 top-12 w-32 bg-white rounded-xl shadow-xl border border-zinc-100 py-1 z-[70]">
                      <button onClick={() => exportChat('txt')} className="w-full px-4 py-2 text-left text-sm hover:bg-[#F2F2F7]">Export TXT</button>
                      <button onClick={() => exportChat('yaml')} className="w-full px-4 py-2 text-left text-sm hover:bg-[#F2F2F7]">Export YAML</button>
                    </div>
                  )}
                </div>
                <div ref={modelMenuRef}>
                  <button onClick={() => setShowModelMenu(!showModelMenu)} className="text-[#007AFF] p-1.5"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                  {showModelMenu && (
                    <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-zinc-100 py-1 z-[70]">
                      <button onClick={() => { setSelectedModel(ModelName.GEMINI_PRO); setShowModelMenu(false); }} className={`w-full px-4 py-2 text-left text-sm flex justify-between ${selectedModel === ModelName.GEMINI_PRO ? 'text-[#007AFF]' : 'text-zinc-900'}`}><span>Gemini Pro</span>{selectedModel === ModelName.GEMINI_PRO && '✓'}</button>
                      <button onClick={() => { setSelectedModel(ModelName.GEMINI_FLASH); setShowModelMenu(false); }} className={`w-full px-4 py-2 text-left text-sm flex justify-between ${selectedModel === ModelName.GEMINI_FLASH ? 'text-[#007AFF]' : 'text-zinc-900'}`}><span>Gemini Flash</span>{selectedModel === ModelName.GEMINI_FLASH && '✓'}</button>
                      <div className="h-px bg-zinc-100 my-1"></div>
                      <button onClick={handleSummarize} disabled={isSummarizing || messages.length === 0} className="w-full px-4 py-2 text-left text-sm font-semibold text-blue-600 disabled:opacity-50 flex items-center space-x-2">
                        {isSummarizing ? <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        <span>Summarize Chat</span>
                      </button>
                      <button onClick={() => { setShowHelp(true); setShowModelMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-zinc-600 hover:bg-[#F2F2F7] flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>Help & Support</span>
                      </button>
                      <div className="h-px bg-zinc-100 my-1"></div>
                      <a href="https://example.com/privacy" target="_blank" rel="noopener noreferrer" className="w-full px-4 py-2 text-left text-xs text-zinc-400 hover:text-zinc-600">Privacy Policy</a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-2 bg-[#F2F2F7]">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 py-10 px-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4"><svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.527 3.653 1.438 5.16L2 22l4.84-1.438C8.347 21.473 10.109 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" /></svg></div>
                  <p className="font-semibold text-zinc-900 mb-2">New Secure Conversation</p>
                  <p className="text-xs text-zinc-500 mb-6 leading-relaxed">Your data stay on this device. We don't share your chats or personal info with anyone.</p>

                  <div className="grid grid-cols-1 gap-2 w-full mb-6">
                    {["Summarize this article", "Explain a concept like I'm 10", "Plan a weekend trip to..."].map((p, i) => (
                      <button key={i} onClick={() => handleSendMessage(p)} className="text-left px-4 py-3 bg-white border border-zinc-100 rounded-xl text-sm text-zinc-700 hover:bg-zinc-50 active:scale-95 transition-all shadow-sm">
                        {p}
                      </button>
                    ))}
                  </div>

                  <div className="bg-blue-50 px-4 py-2 rounded-lg inline-flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Free Plan</span>
                    <span className="text-[11px] text-blue-500">{getRemainingMessages()} messages left today</span>
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onAction={(p, content) => handleSendMessage(`${p}: "${content}"`)}
                    onUseAsPrompt={(content) => {
                      setInputValue(content);
                      // focus textarea is hard without ref, but user will tap it
                    }}
                  />
                ))
              )}
            </div>

            <div className="p-4 pb-8 border-t border-zinc-200 bg-white/90 ios-blur">
              <div className="flex flex-col space-y-3">
                {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !isLoading && (
                  <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
                    {["Ask for examples", "Shorten this", "Turn into an email"].map((p, i) => (
                      <button key={i} onClick={() => handleSendMessage(p)} className="flex-shrink-0 px-3 py-1.5 bg-zinc-100 rounded-full text-[13px] text-zinc-700 hover:bg-zinc-200 active:scale-95 transition-all whitespace-nowrap">
                        {p}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-end space-x-2">
                  <div className="flex-1 bg-[#F2F2F7] rounded-[24px] px-4 py-2 flex items-center min-h-[44px]">
                    <textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} placeholder="iMessage" className="w-full bg-transparent border-none focus:ring-0 text-[16px] resize-none py-1 leading-tight" rows={1} />
                  </div>
                  <button onClick={() => handleSendMessage()} disabled={!inputValue.trim() || isLoading} className={`w-9 h-9 rounded-full flex items-center justify-center ${!inputValue.trim() || isLoading ? 'bg-zinc-200 text-zinc-400' : 'bg-[#007AFF] text-white shadow-md'}`}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 -rotate-90"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg></button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* iOS-Style Summary Sheet */}
        {chatSummary && (
          <div className="absolute inset-0 z-[100] flex items-end">
            <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-300" onClick={() => setChatSummary(null)} />
            <div className="w-full bg-white rounded-t-[20px] shadow-2xl z-[110] animate-in slide-in-from-bottom duration-300 max-h-[70%] flex flex-col">
              <div className="flex justify-center p-3">
                <div className="w-10 h-1 bg-zinc-300 rounded-full" />
              </div>
              <div className="px-6 pb-8 pt-2 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Chat Summary</h2>
                  <button onClick={() => setChatSummary(null)} className="bg-zinc-100 p-1 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="text-[15px] leading-relaxed text-zinc-800 space-y-4">
                  {chatSummary.split('\n').map((line, i) => (
                    <p key={i} className={line.trim().startsWith('*') || line.trim().startsWith('-') ? 'pl-4 relative before:content-["•"] before:absolute before:left-0' : ''}>
                      {line.trim().replace(/^[*+-]\s*/, '')}
                    </p>
                  ))}
                </div>

                <div className="mt-8 space-y-3">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => exportSummary('txt')}
                      className="flex-1 bg-zinc-100 text-zinc-900 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 active:bg-zinc-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      <span>Save TXT</span>
                    </button>
                    <button
                      onClick={() => exportSummary('yaml')}
                      className="flex-1 bg-zinc-100 text-zinc-900 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 active:bg-zinc-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      <span>Save YAML</span>
                    </button>
                  </div>
                  <button onClick={() => setChatSummary(null)} className="w-full bg-[#007AFF] text-white py-3 rounded-xl font-semibold active:opacity-80 transition-opacity">Done</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* iOS-Style Help Sheet */}
        {showHelp && (
          <div className="absolute inset-0 z-[100] flex items-end">
            <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-300" onClick={() => setShowHelp(false)} />
            <div className="w-full bg-white rounded-t-[20px] shadow-2xl z-[110] animate-in slide-in-from-bottom duration-300 max-h-[85%] flex flex-col">
              <div className="flex justify-center p-3">
                <div className="w-10 h-1 bg-zinc-300 rounded-full" />
              </div>
              <div className="px-6 pb-8 pt-2 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Help & Support</h2>
                  <button onClick={() => setShowHelp(false)} className="bg-zinc-100 p-1 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="space-y-6">
                  {/* Key Benefits Section */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                      <div className="text-2xl mb-2">🔒</div>
                      <h3 className="font-bold text-sm text-blue-900">Total Privacy</h3>
                      <p className="text-[11px] text-blue-700/80 leading-tight mt-1">Chat history stays 100% on your device. No accounts, no tracking.</p>
                    </div>
                    <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100/50">
                      <div className="text-2xl mb-2">⚡</div>
                      <h3 className="font-bold text-sm text-purple-900">Fast & Free</h3>
                      <p className="text-[11px] text-purple-700/80 leading-tight mt-1">Powered by Gemini for instant answers without subscriptions.</p>
                    </div>
                  </div>

                  <section>
                    <h3 className="text-sm font-bold text-zinc-900 mb-3 flex items-center"><svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Boost Your Productivity</h3>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 text-sm">💡</div>
                        <div>
                          <p className="font-semibold text-sm">One-Tap Prompting</p>
                          <p className="text-xs text-zinc-500">Stop typing repetitive prompts. Use "Smart Chips" for instant summaries, emails, and translations.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 text-sm">✍️</div>
                        <div>
                          <p className="font-semibold text-sm">Perfect Your Writing</p>
                          <p className="text-xs text-zinc-500">Long-press any response to instantly change its tone, shorten it, or expand into details.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 text-sm">♻️</div>
                        <div>
                          <p className="font-semibold text-sm">Zero Friction Iteration</p>
                          <p className="text-xs text-zinc-500">Use "Use as Prompt" to reuse and refine AI answers without copy-pasting manually.</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="bg-zinc-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-sm font-bold mb-1">Why Choose AI Chat Pro?</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed italic">"The most professional way to use AI on mobile. No cloud storage, no complex sign-ups, just pure productivity."</p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl"></div>
                  </section>
                </div>

                <div className="mt-8">
                  <button onClick={() => setShowHelp(false)} className="w-full bg-[#007AFF] text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all focus:outline-none">Start Creating</button>
                  <div className="flex justify-center items-center space-x-4 mt-6">
                    <span className="text-[10px] text-zinc-400">Ver 1.0.0</span>
                    <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Privacy First Certified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-black/10 rounded-full hidden sm:block"></div>
      </div>
    </div>
  );
};

export default App;
