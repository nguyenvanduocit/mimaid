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

export interface AIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  thinkingBudget?: number;
  enableGrounding?: boolean;
  enableUrlContext?: boolean;
  dynamicRetrievalThreshold?: number;
}

export interface GroundingMetadata {
  webSearchQueries?: string[];
  groundingSources?: Array<{
    uri: string;
    snippet: string;
  }>;
  citationMetadata?: {
    citationSources: Array<{
      startIndex: number;
      endIndex: number;
      uri: string;
    }>;
  };
}

export interface Preset {
  title: string;
  prompt: string;
}

export interface MermaidError {
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  source?: string;
} 