export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  isCode?: boolean;
  isError?: boolean;
}

export interface FlagStatus {
  id: string;
  title: string;
  description: string;
  points: number;
  unlocked: boolean;
  hint: string;
}

export interface APISettings {
  hasGemini: boolean;
  hasClaude: boolean;
  hasArmorIQ: boolean;
  geminiModel: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}
