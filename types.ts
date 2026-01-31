
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
}

export interface Project {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
  projectId?: string;
  projectEmoji?: string;
}

export enum ModelName {
  GEMINI_PRO = 'gemini-3-pro-preview',
  GEMINI_FLASH = 'gemini-3-flash-preview'
}
