import { EditorConfig, AIConfig } from './types';

export const EDITOR_CONFIG: EditorConfig = {
  minScale: 0.5,
  maxScale: 20,
  minWidth: 20,
  zoomFactor: 0.1,
};

export const AI_CONFIG: AIConfig = {
  apiKey: localStorage.getItem('anthropicApiKey') || import.meta.env.VITE_ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.3,
  maxTokens: 8192,
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