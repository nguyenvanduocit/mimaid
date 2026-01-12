export interface EditorState {
  isResizing: boolean;
}

export interface EditorConfig {
  minScale: number;
  maxScale: number;
  minWidth: number;
  zoomFactor: number;
}

export interface EditorElements {
  previewPane: HTMLDivElement;
  mermaidPreview: HTMLDivElement;
  container: HTMLDivElement;
  editorPane: HTMLDivElement;
  handle: HTMLDivElement;
  errorOverlay: HTMLDivElement;
  zoomInButton: HTMLButtonElement;
  zoomOutButton: HTMLButtonElement;
  generationStatus: HTMLSpanElement;
}

export type AIProviderType = "google" | "openai" | "anthropic";

export interface AIConfig {
  provider: AIProviderType;
  apiKey: string;
  model: string;
  temperature: number;
}

export interface Preset {
  title: string;
  prompt: string;
}

export interface MermaidError {
  message: string;
  line?: number;
  column?: number;
  severity: "error" | "warning" | "info";
  source?: string;
}
