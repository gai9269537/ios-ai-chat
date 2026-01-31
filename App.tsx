
import React, { useState, useRef, useEffect, useMemo } from 'react';
import StatusBar from './components/StatusBar';
import MessageBubble from './components/MessageBubble';
import { Message, ChatSession, ModelName, Project } from './types';
import { getGeminiResponse, summarizeChat } from './services/gemini';
import { isUsageLimitReached, incrementUsage, getRemainingMessages } from './services/usage';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Dialog } from '@capacitor/dialog';
import { Device } from '@capacitor/device';
import { Keyboard } from '@capacitor/keyboard';

const STORAGE_KEY = 'ios_ai_chat_sessions_v1';
const MODEL_STORAGE_KEY = 'ios_ai_chat_selected_model';
const PROJECT_STORAGE_KEY = 'ios_ai_chat_projects_v1';

const INITIAL_PROJECTS: Project[] = [
  { id: 'work', name: 'Work', emoji: '💼', color: 'bg-blue-50' },
  { id: 'creative', name: 'Ideas', emoji: '🎨', color: 'bg-purple-50' },
  { id: 'coding', name: 'Dev', emoji: '💻', color: 'bg-zinc-800' },
  { id: 'personal', name: 'Life', emoji: '🏠', color: 'bg-orange-50' },
];

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((s: any) => {
        if (!s || typeof s !== 'object') return null;
        return {
          ...s,
          lastUpdated: s.lastUpdated ? new Date(s.lastUpdated) : new Date(),
          messages: Array.isArray(s.messages) ? s.messages.map((m: any) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
          })) : []
        };
      }).filter(Boolean) as ChatSession[];
    } catch (e) {
      console.error("Failed to parse sessions:", e);
      return [];
    }
  });
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
  const [isSplashVisible, setIsSplashVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('gemini_api_key_v1') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(geminiApiKey);
  const [activeProjectId, setActiveProjectId] = useState('all');
  const [isNative, setIsNative] = useState(Capacitor.isNativePlatform());

  useEffect(() => {
    const checkPlatform = async () => {
      const info = await Device.getInfo();
      setIsNative(Capacitor.isNativePlatform());
    };
    checkPlatform();
  }, []);

  // Robust project initialization
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(PROJECT_STORAGE_KEY);
      if (!saved) return INITIAL_PROJECTS;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_PROJECTS;
    } catch (e) {
      console.error("Failed to parse projects:", e);
      return INITIAL_PROJECTS;
    }
  });

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState({ name: '', emoji: '' });

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    Haptics.impact({ style: ImpactStyle.Medium });
    const { value } = await Dialog.confirm({
      title: 'Delete Workspace',
      message: 'Are you sure you want to delete this workspace and all its data?',
      okButtonTitle: 'Delete',
      cancelButtonTitle: 'Cancel'
    });

    if (value) {
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) setCurrentSessionId(null);
      Haptics.notification({ type: ImpactStyle.Heavy as any });
    }
  };

  const moveSession = (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    const newSessions = [...sessions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newSessions.length) {
      [newSessions[index], newSessions[targetIndex]] = [newSessions[targetIndex], newSessions[index]];
      setSessions(newSessions);
    }
  };

  const handleSaveProject = () => {
    if (!projectForm.name.trim()) return;
    if (editingProject) {
      setProjects(prev => prev.map(p => p.id === editingProject.id ? { ...p, name: projectForm.name, emoji: projectForm.emoji || '📦' } : p));
    } else {
      const newProject: Project = {
        id: Date.now().toString(),
        name: projectForm.name,
        emoji: projectForm.emoji || '📦',
        color: 'bg-zinc-100'
      };
      setProjects(prev => [...prev, newProject]);
    }
    setShowProjectModal(false);
    setEditingProject(null);
    setProjectForm({ name: '', emoji: '' });
  };

  const deleteProject = async (id: string) => {
    Haptics.impact({ style: ImpactStyle.Medium });
    const { value } = await Dialog.confirm({
      title: 'Delete Category',
      message: "Delete this workspace category? Sessions within it won't be deleted but will appear in 'All'.",
      okButtonTitle: 'Delete',
      cancelButtonTitle: 'Cancel'
    });

    if (value) {
      setProjects(prev => prev.filter(p => p.id !== id));
      setSessions(prev => prev.map(s => s.projectId === id ? { ...s, projectId: undefined, projectEmoji: undefined } : s));
      if (activeProjectId === id) setActiveProjectId('all');
      Haptics.notification({ type: ImpactStyle.Heavy as any });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashVisible(false), 1800);
    return () => clearTimeout(timer);
  }, []);

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
    if (geminiApiKey) {
      import('./services/gemini').then(m => m.setGeminiApiKey(geminiApiKey));
      localStorage.setItem('gemini_api_key_v1', geminiApiKey);
    }
  }, [geminiApiKey]);

  useEffect(() => {
    const savedModel = localStorage.getItem(MODEL_STORAGE_KEY) as ModelName;
    if (savedModel && Object.values(ModelName).includes(savedModel)) setSelectedModel(savedModel);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const currentSession = useMemo(() =>
    sessions.find(s => s.id === currentSessionId),
    [sessions, currentSessionId]
  );

  const messages = currentSession?.messages || [];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, currentSessionId]);

  const createNewSession = () => {
    const activeProject = projects.find(p => p.id === activeProjectId);
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      lastUpdated: new Date(),
      projectId: activeProjectId === 'all' ? undefined : activeProjectId,
      projectEmoji: activeProject?.emoji
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const messageText = customPrompt || inputValue;
    if (!messageText.trim() || isLoading) return;

    let targetSessionId = currentSessionId;

    // If no active session (Home Screen), create one automatically
    if (!targetSessionId) {
      const newId = Date.now().toString();
      const activeProject = projects.find(p => p.id === activeProjectId);
      const newSession: ChatSession = {
        id: newId,
        title: messageText.length > 30 ? messageText.substring(0, 30) + '...' : messageText,
        messages: [],
        lastUpdated: new Date(),
        projectId: activeProjectId === 'all' ? undefined : activeProjectId,
        projectEmoji: activeProject?.emoji
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newId);
      targetSessionId = newId;
    }

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: messageText, timestamp: new Date(), status: 'sent' };
    const assistantId = (Date.now() + 1).toString();
    const assistantPlaceholder: Message = { id: assistantId, role: 'assistant', content: '', timestamp: new Date(), status: 'sending' };

    if (!customPrompt) setInputValue('');
    setIsLoading(true);

    setSessions(prev => prev.map(s => s.id === targetSessionId ? { ...s, lastUpdated: new Date(), messages: [...s.messages, userMessage, assistantPlaceholder] } : s));

    if (isUsageLimitReached()) {
      await Dialog.alert({
        title: 'Limit Reached',
        message: "Daily free limit reached. We are keeping it free for now by limiting daily usage. Please come back tomorrow!"
      });
      setIsLoading(false);
      return;
    }

    Haptics.impact({ style: ImpactStyle.Light });

    try {
      let accumulated = "";
      await getGeminiResponse(messageText, selectedModel, [], (chunk) => {
        accumulated += chunk;
        setSessions(prev => prev.map(s => s.id === targetSessionId ? { ...s, messages: s.messages.map(msg => msg.id === assistantId ? { ...msg, content: accumulated } : msg) } : s));
      });
      incrementUsage();
      setSessions(prev => prev.map(s => s.id === targetSessionId ? { ...s, messages: s.messages.map(msg => msg.id === assistantId ? { ...msg, status: 'sent' } : msg) } : s));
    } catch (error) {
      setSessions(prev => prev.map(s => s.id === targetSessionId ? { ...s, messages: s.messages.map(msg => msg.id === assistantId ? { ...msg, content: "Error communicating with AI.", status: 'error' } : msg) } : s));
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
    <div className={`flex items-center justify-center min-h-screen bg-zinc-100 font-['Inter'] ${isNative ? 'p-0' : 'p-0 sm:p-4'}`}>
      <div className={`relative w-full h-screen bg-[#F2F2F7] overflow-hidden flex flex-col ${isNative ? 'rounded-0' : 'sm:h-[844px] sm:w-[390px] sm:rounded-[40px] shadow-2xl border-[8px] border-zinc-900 sm:border-[12px]'}`}>

        {isSplashVisible ? (
          <div className="absolute inset-0 z-[200] bg-white flex flex-col items-center justify-center animate-in fade-out duration-500 delay-1000 fill-mode-forwards">
            <div className="w-32 h-32 mb-6 animate-pulse-soft">
              <img src="/logo.png" alt="Coda AI" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold font-['Outfit'] coda-gradient-text">Coda AI</h1>
            <div className="mt-8 flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
            </div>
          </div>
        ) : (
          <>
            <StatusBar />

            {/* Premium Glass Header */}
            <div className="coda-glass px-4 pt-10 pb-3 z-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  {!currentSessionId ? (
                    <div className="flex items-center space-x-2">
                      <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                      <h1 className="text-2xl font-bold font-['Outfit'] coda-gradient-text tracking-tight">Coda AI</h1>
                    </div>
                  ) : (
                    <button onClick={() => { setCurrentSessionId(null); Haptics.impact({ style: ImpactStyle.Light }); }} className="flex items-center text-[#007AFF] active:opacity-50 transition-opacity">
                      <svg className="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                      <div className="flex flex-col items-start -space-y-1 mt-0.5">
                        <span className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">{currentSession?.projectEmoji || '🌟'} {currentSession?.projectId || 'Workspace'}</span>
                        <span className="text-[17px] font-bold">Back</span>
                      </div>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  {!currentSessionId && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => { setEditingProject(null); setProjectForm({ name: '', emoji: '' }); setShowProjectModal(true); }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-full active:scale-90 transition-all shadow-lg shadow-blue-500/20"
                        title="Add New Lab"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        <span className="text-[11px] font-black uppercase tracking-wider">Lab</span>
                      </button>
                      {sessions.length > 0 && (
                        <button
                          onClick={() => setIsEditMode(!isEditMode)}
                          className={`px-4 py-1.5 rounded-full text-[13px] font-black transition-all ${isEditMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                        >
                          {isEditMode ? 'Done' : 'Edit'}
                        </button>
                      )}
                    </div>
                  )}
                  {!currentSessionId ? (
                    <button onClick={createNewSession} className="bg-zinc-100 hover:bg-zinc-200 text-[#007AFF] p-2.5 rounded-full active:scale-95 transition-all shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  ) : (
                    <div className="flex space-x-3 relative">
                      <div ref={exportMenuRef}>
                        <button onClick={() => setShowExportMenu(!showExportMenu)} className="text-[#007AFF] p-1.5 active:scale-90 transition-transform"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                        {showExportMenu && (
                          <div className="absolute right-0 top-12 w-48 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-zinc-200 py-2.5 z-[70] animate-in zoom-in duration-200">
                            <button onClick={() => exportChat('txt')} className="w-full px-5 py-2.5 text-left text-sm font-bold text-zinc-900 hover:bg-zinc-50 flex items-center justify-between"><span>Export TXT</span><span className="text-[10px] text-zinc-400">.txt</span></button>
                            <button onClick={() => exportChat('yaml')} className="w-full px-5 py-2.5 text-left text-sm font-bold text-zinc-900 hover:bg-zinc-50 flex items-center justify-between"><span>Export YAML</span><span className="text-[10px] text-zinc-400">.yaml</span></button>
                            <div className="h-px bg-zinc-100 my-2"></div>
                            <button onClick={() => { setShowSettings(true); setShowExportMenu(false); }} className="w-full px-5 py-2.5 text-left text-sm font-bold text-blue-600 hover:bg-blue-50">API Settings</button>
                          </div>
                        )}
                      </div>
                      <div ref={modelMenuRef}>
                        <button onClick={() => setShowModelMenu(!showModelMenu)} className="text-[#007AFF] p-1.5 active:scale-90 transition-transform"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                        {showModelMenu && (
                          <div className="absolute right-0 top-12 w-56 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-zinc-200 py-2 z-[70] animate-in zoom-in duration-200">
                            <div className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Selected Model</div>
                            <button onClick={() => { setSelectedModel(ModelName.GEMINI_PRO); setShowModelMenu(false); }} className={`w-full px-4 py-2.5 text-left text-sm flex justify-between font-bold ${selectedModel === ModelName.GEMINI_PRO ? 'text-[#007AFF] bg-blue-50' : 'text-zinc-900'}`}><span>Gemini Pro</span>{selectedModel === ModelName.GEMINI_PRO && '✓'}</button>
                            <button onClick={() => { setSelectedModel(ModelName.GEMINI_FLASH); setShowModelMenu(false); }} className={`w-full px-4 py-2.5 text-left text-sm flex justify-between font-bold ${selectedModel === ModelName.GEMINI_FLASH ? 'text-[#007AFF] bg-blue-50' : 'text-zinc-900'}`}><span>Gemini Flash</span>{selectedModel === ModelName.GEMINI_FLASH && '✓'}</button>
                            <div className="h-px bg-zinc-200/50 my-2"></div>
                            <button onClick={handleSummarize} disabled={isSummarizing || messages.length === 0} className="w-full px-4 py-2.5 text-left text-sm font-bold text-[#007AFF] disabled:opacity-50 flex items-center space-x-2 hover:bg-zinc-50">
                              {isSummarizing ? <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                              <span>Summarize Chat</span>
                            </button>
                            <button onClick={() => { setShowHelp(true); setShowModelMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm font-bold text-zinc-700 hover:bg-zinc-50 flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              <span>Help & Support</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-3 bg-[#F2F2F7] no-scrollbar">
              {!currentSessionId ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
                  <div className="flex flex-col items-center mb-8 mt-4 text-center">
                    <img src="/logo.png" alt="Logo" className="w-16 h-16 mb-3 animate-pulse-soft" />
                    <h2 className="text-xl font-black font-['Outfit'] text-zinc-900 tracking-tight">Your Workspaces</h2>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Sovereign Control</p>
                  </div>

                  {/* Project Picker with Scroll Indicator */}
                  <div className="relative">
                    <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar px-1 py-2">
                      <button
                        onClick={() => { setEditingProject(null); setProjectForm({ name: '', emoji: '' }); setShowProjectModal(true); Haptics.impact({ style: ImpactStyle.Medium }); }}
                        className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white border-2 border-blue-600 shadow-xl shadow-blue-500/30 active:scale-95 transition-all whitespace-nowrap flex-shrink-0"
                      >
                        <span className="text-lg font-bold">+</span>
                        <span className="text-[13px] font-black uppercase tracking-widest">Add Lab</span>
                      </button>

                      <button
                        onClick={() => setActiveProjectId('all')}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl whitespace-nowrap transition-all duration-300 border-2 ${activeProjectId === 'all'
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-xl scale-105'
                          : 'bg-white text-zinc-500 border-white hover:border-zinc-100'
                          }`}
                      >
                        <span className="text-lg">🌟</span>
                        <span className="text-[13px] font-black uppercase tracking-widest">All</span>
                      </button>

                      {Array.isArray(projects) && projects.map(project => (
                        <div key={project.id} className="relative group flex-shrink-0">
                          <button
                            onClick={() => isEditMode ? (setEditingProject(project), setProjectForm({ name: project.name, emoji: project.emoji }), setShowProjectModal(true)) : setActiveProjectId(project.id)}
                            className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl whitespace-nowrap transition-all duration-300 border-2 ${activeProjectId === project.id
                              ? 'bg-zinc-900 text-white border-zinc-900 shadow-xl scale-105'
                              : 'bg-white text-zinc-500 border-white hover:border-zinc-100'
                              } ${isEditMode ? 'pr-10' : ''}`}
                          >
                            <span className="text-lg">{project.emoji}</span>
                            <span className="text-[13px] font-black uppercase tracking-widest">{project.name}</span>
                          </button>
                          {isEditMode && (
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center scale-75 active:scale-50 transition-transform"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Right Fade Indicator */}
                    <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#F2F2F7] to-transparent pointer-events-none z-10 opacity-70"></div>
                  </div>

                  <div className="space-y-3 pt-2">
                    {sessions
                      .filter(s => activeProjectId === 'all' || s.projectId === activeProjectId)
                      .map((s, idx) => (
                        <div key={s.id} onClick={() => !isEditMode && setCurrentSessionId(s.id)} className={`px-5 py-4 bg-white rounded-[26px] flex items-center space-x-4 transition-all group shadow-sm border border-white/50 ${isEditMode ? 'cursor-default ring-2 ring-blue-500/10' : 'active:scale-[0.98] cursor-pointer hover:shadow-md'}`}>
                          {isEditMode ? (
                            <button onClick={(e) => deleteSession(e, s.id)} className="w-10 h-10 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform hover:bg-red-500 hover:text-white">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          ) : (
                            <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-bold text-xl shadow-lg ${s.projectId ? 'bg-zinc-900 shadow-zinc-900/10' : 'bg-gradient-to-tr from-[#007AFF] to-[#00C6FF] shadow-blue-500/20'}`}>
                              {s.projectEmoji || s.title.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                              <h3 className="font-bold text-[16px] truncate text-zinc-900">{s.title}</h3>
                              {!isEditMode && <span className="text-[11px] font-extrabold text-[#007AFF] opacity-70">{s.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                            <p className="text-[13px] font-medium text-zinc-500 truncate">{s.messages.length > 0 ? s.messages[s.messages.length - 1].content : 'No messages yet'}</p>
                          </div>
                          {isEditMode && (
                            <div className="flex flex-col space-y-1">
                              <button onClick={(e) => moveSession(e, idx, 'up')} disabled={idx === 0} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 disabled:opacity-10 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                              </button>
                              <button onClick={(e) => moveSession(e, idx, 'down')} disabled={idx === sessions.length - 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 disabled:opacity-10 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                  {sessions.filter(s => activeProjectId === 'all' || s.projectId === activeProjectId).length === 0 && (
                    <div className="text-center py-20 animate-in fade-in duration-700">
                      <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center mx-auto mb-5 shadow-sm border border-zinc-100"><svg className="w-8 h-8 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div>
                      <p className="text-zinc-500 font-black text-xs uppercase tracking-widest">Empty Workspace</p>
                      <p className="text-zinc-400 text-[10px] mt-1">Start a {activeProjectId !== 'all' ? activeProjectId : 'new'} project below</p>
                    </div>
                  )}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 py-6 px-10 text-center animate-slide-up">
                  <div className="w-32 h-32 rounded-[40px] bg-white flex items-center justify-center shadow-2xl shadow-blue-500/10 mb-8 border border-white overflow-hidden relative group">
                    <img src="/logo.png" alt="Logo" className="w-24 h-24 object-contain group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent"></div>
                  </div>
                  <h2 className="text-3xl font-bold text-zinc-900 mb-2 font-['Outfit'] coda-gradient-text">New Session</h2>
                  <p className="text-[14px] text-zinc-500 mb-10 leading-relaxed font-semibold italic">"Proactive intelligence for your daily tasks."</p>

                  <div className="grid grid-cols-1 gap-3 w-full mb-10">
                    {["Summarize this article", "Explain a concept like I'm 10", "Plan a weekend trip to..."].map((p, i) => (
                      <button key={i} onClick={() => handleSendMessage(p)} className="coda-card text-left px-6 py-5 border border-zinc-200/50 text-[15px] font-bold text-zinc-800 hover:border-blue-300 active:scale-[0.97] transition-all flex items-center justify-between group">
                        <span>{p}</span>
                        <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                          <svg className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-full inline-flex items-center space-x-3 shadow-xl shadow-blue-500/10 border border-white">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
                    <span className="text-[12px] uppercase font-bold text-zinc-900 tracking-widest">{getRemainingMessages()} credits available</span>
                  </div>
                </div>
              ) : messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onAction={(p, content) => handleSendMessage(`${p}: "${content}"`)}
                  onUseAsPrompt={(content) => {
                    setInputValue(content);
                  }}
                />
              ))}
            </div>

            {!isEditMode && (
              <div className="p-4 pb-12 coda-glass shadow-2xl z-50 animate-in slide-in-from-bottom duration-500">
                <div className="flex flex-col space-y-4">
                  {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !isLoading && (
                    <div className="flex space-x-2.5 overflow-x-auto no-scrollbar pb-1 px-1">
                      {["Ask for examples", "Shorten this", "Turn into an email"].map((p, i) => (
                        <button key={i} onClick={() => handleSendMessage(p)} className="flex-shrink-0 px-5 py-2.5 bg-white border border-blue-100 rounded-full text-[13px] font-bold text-blue-600 hover:bg-blue-50 active:scale-95 transition-all whitespace-nowrap shadow-sm">
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end space-x-3">
                    <div className="flex-1 bg-white rounded-[32px] px-6 py-3.5 flex items-center min-h-[56px] border border-blue-100 focus-within:border-blue-500 focus-within:shadow-[0_0_0_4px_rgba(0,122,255,0.05)] transition-all">
                      <button
                        onClick={() => {
                          if (isListening) {
                            recognitionRef.current?.stop();
                            setIsListening(false);
                          } else {
                            setIsListening(true);
                            recognitionRef.current?.start();
                          }
                        }}
                        className={`mr-3 p-1 rounded-full transition-all ${isListening ? 'text-red-500 animate-pulse bg-red-50 scale-125' : 'text-zinc-400 hover:text-blue-500'}`}
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                      </button>
                      <textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} placeholder={!currentSessionId ? (activeProjectId === 'all' ? "Start a new project..." : `New ${activeProjectId} session...`) : "Message Coda AI..."} className="flex-1 bg-transparent border-none focus:ring-0 text-[16px] font-medium resize-none py-0.5 leading-tight text-zinc-800 placeholder:text-zinc-400" rows={1} />
                    </div>
                    <button onClick={() => handleSendMessage()} disabled={!inputValue.trim() || isLoading} className={`w-13 h-13 min-w-[52px] min-h-[52px] rounded-full flex items-center justify-center transition-all shadow-xl ${!inputValue.trim() || isLoading ? 'bg-zinc-100 text-zinc-300' : 'bg-blue-600 text-white shadow-blue-500/30 active:scale-90 active:rotate-12'}`}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 -rotate-45 ml-1"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg></button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-black/10 rounded-full hidden sm:block"></div>

        {/* Full Modal Layer (Summary/Help) - Re-used current sessionId logic for sheets */}
        {chatSummary && (
          <div className="absolute inset-0 z-[100] flex items-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setChatSummary(null)} />
            <div className="w-full bg-white rounded-t-[32px] shadow-2xl z-[110] animate-in slide-in-from-bottom duration-400 max-h-[85%] flex flex-col">
              <div className="flex justify-center p-4">
                <div className="w-12 h-1.5 bg-zinc-200 rounded-full" />
              </div>
              <div className="px-8 pb-10 pt-2 overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold font-['Outfit'] coda-gradient-text">Chat Summary</h2>
                  <button onClick={() => setChatSummary(null)} className="bg-zinc-100 p-2 rounded-full active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="text-[16px] leading-relaxed text-zinc-800 space-y-5 font-medium">
                  {chatSummary.split('\n').map((line, i) => (
                    <p key={i} className={line.trim().startsWith('*') || line.trim().startsWith('-') ? 'pl-6 relative before:content-["•"] before:absolute before:left-0 before:text-blue-500 before:font-black' : ''}>
                      {line.trim().replace(/^[*+-]\s*/, '')}
                    </p>
                  ))}
                </div>
                <div className="mt-10 space-y-4">
                  <div className="flex space-x-3">
                    <button onClick={() => exportSummary('txt')} className="flex-1 bg-zinc-100 text-zinc-900 py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 active:bg-zinc-200 transition-colors"><span>Save TXT</span></button>
                    <button onClick={() => exportSummary('yaml')} className="flex-1 bg-zinc-100 text-zinc-900 py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 active:bg-zinc-200 transition-colors"><span>Save YAML</span></button>
                  </div>
                  <button onClick={() => setChatSummary(null)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 active:opacity-80">Done</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showHelp && (
          <div className="absolute inset-0 z-[100] flex items-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowHelp(false)} />
            <div className="w-full bg-white rounded-t-[32px] shadow-2xl z-[110] animate-in slide-in-from-bottom duration-400 max-h-[90%] flex flex-col">
              <div className="flex justify-center p-4">
                <div className="w-12 h-1.5 bg-zinc-200 rounded-full" />
              </div>
              <div className="px-8 pb-10 pt-2 overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold font-['Outfit'] coda-gradient-text">Master Coda AI</h2>
                  <button onClick={() => setShowHelp(false)} className="bg-zinc-100 p-2 rounded-full active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-5 rounded-[24px] border border-blue-100">
                      <div className="text-3xl mb-3">🔒</div>
                      <h3 className="font-bold text-sm text-blue-900">History Privacy</h3>
                      <p className="text-[11px] text-blue-700 leading-snug mt-1.5">Your chat history is saved 100% locally. No accounts needed.</p>
                    </div>
                    <div className="bg-azure-50 p-5 rounded-[24px] border border-azure-100">
                      <div className="text-3xl mb-3">⚡</div>
                      <h3 className="font-bold text-sm text-blue-900">Fast & Free</h3>
                      <p className="text-[11px] text-blue-700 leading-snug mt-1.5">Gemini-powered lightning responses.</p>
                    </div>
                  </div>

                  <section>
                    <h3 className="text-sm font-black text-zinc-900 mb-5 flex items-center uppercase tracking-widest"><svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Proactive Tips</h3>
                    <div className="space-y-5">
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center flex-shrink-0 text-lg shadow-sm">💡</div>
                        <div>
                          <p className="font-bold text-sm">One-Tap Precision</p>
                          <p className="text-[12px] text-zinc-500 font-medium leading-relaxed">Use Precision Chips for instant summaries and reformatting.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center flex-shrink-0 text-lg shadow-sm">🎤</div>
                        <div>
                          <p className="font-bold text-sm">Voice Mastery</p>
                          <p className="text-[12px] text-zinc-500 font-medium leading-relaxed">Tap the mic to dictate proactive tasks. Perfect for on-the-go ideation.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center flex-shrink-0 text-lg shadow-sm">🗂️</div>
                        <div>
                          <p className="font-bold text-sm">Project Logic</p>
                          <p className="text-[12px] text-zinc-500 font-medium leading-relaxed">Use category tabs (Work, Dev, Ideas) to isolate your cognitive contexts.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center flex-shrink-0 text-lg shadow-sm">🎯</div>
                        <div>
                          <p className="font-bold text-sm">Coda Core Tools</p>
                          <p className="text-[12px] text-zinc-500 font-medium leading-relaxed">Long-press any bubble to refine tone or expand logic.</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="bg-zinc-900 text-white p-6 rounded-[28px] shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-sm font-black mb-2 uppercase tracking-widest text-[#007AFF]">Data Transparency</h3>
                      <p className="text-[12px] text-zinc-300 leading-relaxed font-bold">
                        While your history is 100% local, Coda AI sends messages to Google's Gemini API for processing. Your data is governed by Google's Privacy Policy during transmission.
                      </p>
                    </div>
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[60px]"></div>
                  </section>
                </div>
                <div className="mt-10">
                  <button onClick={() => setShowHelp(false)} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all">START CREATING</button>
                  <div className="flex justify-center items-center space-x-4 mt-8 opacity-40">
                    <span className="text-[10px] font-black tracking-widest">VER 1.0.0</span>
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full"></span>
                    <span className="text-[10px] font-black tracking-widest uppercase">CODA CORE SECURE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Project Editor Bottom Sheet */}
        {showProjectModal && (
          <div className="absolute inset-0 z-[400] flex items-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowProjectModal(false)} />
            <div className="w-full bg-white rounded-t-[32px] shadow-2xl z-[410] animate-in slide-in-from-bottom duration-400 max-h-[90%] flex flex-col p-8 pb-12">
              <div className="flex justify-center mb-6">
                <div className="w-12 h-1.5 bg-zinc-200 rounded-full" />
              </div>
              <h3 className="text-2xl font-black font-['Outfit'] coda-gradient-text mb-8">{editingProject ? 'Refine Workspace' : 'Initialize Lab'}</h3>

              <div className="space-y-8 flex-1 overflow-y-auto no-scrollbar pb-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Lab Identity Name</label>
                  <input
                    autoFocus
                    value={projectForm.name}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Project Phoenix"
                    className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-[22px] px-6 py-5 font-bold text-zinc-900 focus:border-blue-500 focus:bg-white transition-all outline-none text-lg"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Iconic Identifier</label>
                  <div className="grid grid-cols-5 gap-3">
                    {['💼', '🎨', '💻', '🏠', '📈', '⚡', '🚀', '🔮', '🍱', '🧪'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setProjectForm(prev => ({ ...prev, emoji }))}
                        className={`h-14 flex items-center justify-center text-2xl rounded-2xl transition-all ${projectForm.emoji === emoji ? 'bg-zinc-900 scale-105 shadow-xl text-white' : 'bg-zinc-50 hover:bg-zinc-100 border border-zinc-100'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    <input
                      value={projectForm.emoji}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, emoji: e.target.value.substring(0, 2) }))}
                      placeholder="Or enter custom emoji..."
                      className="w-full bg-zinc-50 border border-transparent rounded-xl px-4 py-3 text-center font-bold text-zinc-400 focus:bg-zinc-100 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 pt-4 border-t border-zinc-50">
                <button
                  onClick={() => setShowProjectModal(false)}
                  className="flex-1 bg-zinc-100 text-zinc-500 py-5 rounded-[24px] font-black uppercase tracking-widest text-[13px] active:scale-95 transition-all"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleSaveProject}
                  className="flex-[2] bg-blue-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest text-[13px] shadow-2xl shadow-blue-500/30 active:scale-95 transition-all"
                >
                  {editingProject ? 'Commit Changes' : 'Confirm & Launch'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div >

  );
};

export default App;
