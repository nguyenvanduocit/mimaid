# API Reference

## MermaidEditor Class

Main controller class quản lý toàn bộ ứng dụng.

### Constructor

```typescript
new MermaidEditor()
```

Khởi tạo editor với DOM initialization, Mermaid setup và event listeners.

### Public Methods

#### `initializeDOM(): void`
Setup các DOM elements và handle editor visibility.

#### `setupEditor(): Promise<void>`
Khởi tạo Monaco editor với cấu hình và bindings.

#### `renderDiagram(code: string): Promise<void>`
Render Mermaid diagram từ code string.

**Parameters:**
- `code` (string): Mermaid diagram code

#### `updatePreview(): Promise<void>`
Cập nhật preview pane với code mới từ editor.

#### `exportToSvg(): void`
Export diagram hiện tại dưới dạng SVG file.

#### `exportToPng(): Promise<void>`
Export diagram hiện tại dưới dạng PNG file.

### Private Methods

#### `initializeMermaid(): void`
Khởi tạo Mermaid engine với configuration.

#### `setupEventListeners(): void`
Setup các event listeners cho editor và UI controls.

#### `setupResizeListeners(): void`
Setup resize handle cho split pane.

#### `setupPanZoomListeners(): void`
Setup pan và zoom functionality cho preview pane.

#### `handleZoom(e: WheelEvent): void`
Xử lý zoom events trên preview pane.

#### `updateTransform(): void`
Cập nhật CSS transform cho preview pane.

## AIHandler Class

Quản lý tích hợp với Google Generative AI.

### Constructor

```typescript
new AIHandler(
  editor: monaco.editor.IStandaloneCodeEditor,
  elements: {
    inputField: HTMLTextAreaElement;
    inputArea: HTMLDivElement;
    generationStatus: HTMLSpanElement;
  }
)
```

**Parameters:**
- `editor`: Monaco editor instance
- `elements`: UI elements cần thiết cho AI functionality

### Public Methods

#### `handleSubmit(): Promise<void>`
Xử lý AI prompt submission và generate code.

**Flow:**
1. Validate input
2. Prepare context với previous prompts
3. Call Google AI API
4. Stream response và update editor

### Private Methods

#### `handleStream(stream: AsyncGenerator): Promise<void>`
Xử lý streaming response từ AI API.

**Parameters:**
- `stream`: Async generator từ AI API

#### `setLoadingState(loading: boolean): void`
Toggle loading state cho UI.

**Parameters:**
- `loading`: Loading state boolean

## CollaborationHandler Class

Quản lý real-time collaboration functionality.

### Constructor

```typescript
new CollaborationHandler(editor: monaco.editor.IStandaloneCodeEditor)
```

**Parameters:**
- `editor`: Monaco editor instance

### Public Methods

#### `setup(): void`
Setup collaboration với Liveblocks và Y.js.

**Flow:**
1. Get room ID từ URL
2. Connect tới Liveblocks
3. Setup Y.Doc và YText
4. Create Monaco binding
5. Setup user awareness

## Configuration Objects

### EDITOR_CONFIG

```typescript
interface EditorConfig {
  minScale: number;      // 0.5
  maxScale: number;      // 20
  minWidth: number;      // 20
  zoomFactor: number;    // 0.1
}
```

### AI_CONFIG

```typescript
interface AIConfig {
  apiKey: string;        // From env hoặc localStorage
  model: string;         // 'gemini-2.5-flash-preview-05-20'
  temperature: number;   // 1
  maxTokens: number;     // 64000
}
```

### MERMAID_CONFIG

```typescript
const MERMAID_CONFIG = {
  startOnLoad: false
}
```

### MONACO_CONFIG

```typescript
const MONACO_CONFIG = {
  language: 'mermaid',
  theme: 'mermaid',
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true
}
```

## Utility Functions

### `debounce<T>(func: T, wait: number): T`
Tạo debounced function.

**Parameters:**
- `func`: Function cần debounce
- `wait`: Delay time in milliseconds

**Returns:** Debounced function

### `loadDiagramFromURL(): string | null`
Load diagram code từ URL hash.

**Returns:** Decompressed code hoặc null

### `generateDiagramHash(code: string): void`
Generate và update URL hash với compressed code.

**Parameters:**
- `code`: Mermaid diagram code

### `getStoredEditorWidth(): string | null`
Get editor width từ localStorage.

**Returns:** Stored width hoặc null

### `setStoredEditorWidth(width: string): void`
Save editor width tới localStorage.

**Parameters:**
- `width`: Width value string

### `getRoomIdFromURL(): string | undefined`
Extract room ID từ URL parameters.

**Returns:** Room ID hoặc undefined

### `getUserNameFromURL(): string`
Extract user name từ URL parameters với fallback.

**Returns:** User name hoặc generated name

### `getRandomColor(): string`
Generate random hex color.

**Returns:** Hex color string

## Events

### Monaco Editor Events

#### `onDidChangeModelContent`
Triggered khi editor content thay đổi.

```typescript
editor.onDidChangeModelContent(() => {
  debouncedUpdatePreview();
  debouncedGenerateDiagramHash(editor.getValue());
});
```

#### `onDidChangeCursorPosition`
Triggered khi cursor position thay đổi.

```typescript
editor.onDidChangeCursorPosition(() => {
  console.log("cursor changed");
});
```

### UI Events

#### Export Button Click
```typescript
exportButton.addEventListener("click", () => this.exportToSvg());
```

#### Zoom Controls
```typescript
zoomInButton.addEventListener("click", () => 
  this.handleZoomButtonClick(EDITOR_CONFIG.zoomFactor)
);
zoomOutButton.addEventListener("click", () => 
  this.handleZoomButtonClick(-EDITOR_CONFIG.zoomFactor)
);
```

#### Resize Handle
```typescript
handle.addEventListener("mousedown", (e) => {
  state.isResizing = true;
  // ... resize logic
});
```

## Error Handling

### AI Errors
```typescript
try {
  // AI API call
} catch (error) {
  console.error("Error processing prompt:", error);
  generationStatus.textContent = "❌ Failed to process prompt with AI";
}
```

### Mermaid Render Errors
```typescript
try {
  await mermaid.render('mermaid-preview', code);
} catch (error) {
  this.showError(error.message);
}
```

## Type Definitions

### EditorState
```typescript
interface EditorState {
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
```

### EditorElements
```typescript
interface EditorElements {
  previewPane: HTMLDivElement;
  mermaidPreview: HTMLDivElement;
  container: HTMLDivElement;
  editorPane: HTMLDivElement;
  handle: HTMLDivElement;
  errorOverlay: HTMLDivElement;
  exportButton: HTMLButtonElement;
  exportPngButton: HTMLButtonButton;
  zoomInButton: HTMLButtonElement;
  zoomOutButton: HTMLButtonElement;
  generationStatus: HTMLSpanElement;
}
``` 