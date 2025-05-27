export interface EditorState {
  scale: number;
  translateX: number;
  translateY: number;
  isDragging: boolean;
  isResizing: boolean;
  startX: number;
  startY: number;
  zoomTranslateX: number;
  zoomTranslateY: number;
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
  exportButton: HTMLButtonElement;
  exportPngButton: HTMLButtonElement;
  zoomInButton: HTMLButtonElement;
  zoomOutButton: HTMLButtonElement;
  generationStatus: HTMLSpanElement;
}

export interface AIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  thinking: {
    type: "enabled" | "disabled";
    budgetTokens: number;
  };
} 