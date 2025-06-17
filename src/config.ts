import { EditorConfig, AIConfig } from './types';

export const EDITOR_CONFIG: EditorConfig = {
  minScale: 0.5,
  maxScale: 20,
  minWidth: 20,
  zoomFactor: 0.1,
};

export const AI_CONFIG: AIConfig = {
  apiKey: localStorage.getItem('googleAiApiKey') || import.meta.env.VITE_GOOGLE_AI_API_KEY,
  model: 'gemini-2.5-pro-preview-06-05',
  temperature: 1,
  maxTokens: 64000,
};

export const MERMAID_CONFIG = {
  startOnLoad: false,
};

export const MONACO_CONFIG = {
  language: 'mermaid',
  theme: 'mermaid',
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
}; 