# MinimalMermaid API Documentation

## Overview

MinimalMermaid is a TypeScript-based Mermaid diagram editor with AI integration and real-time collaboration. The architecture is modular and event-driven with clear separation of concerns.

## Core Classes

### MermaidEditor

**File**: `src/main.ts`

Main application controller that orchestrates all components and manages the overall application state.

#### Constructor
```typescript
constructor()
```
Initializes the editor, sets up DOM elements, event listeners, and loads initial state.

#### Key Methods

##### DOM Management
- **`initializeDOM()`**: Sets up DOM elements and handles editor visibility
- **`initializeElements()`**: Initializes UI element references
- **`handleEditorVisibility()`**: Manages editor pane visibility based on URL parameters
- **`hideEditorPane()`**: Hides editor pane for view-only mode

##### Editor Setup
- **`setupEditor()`**: **async** - Initializes Monaco editor with lazy loading
- **`setupHandlers()`**: **async** - Sets up AI and collaboration handlers
- **`setupEditorEventListeners()`**: Configures Monaco editor event handlers

##### Diagram Rendering
- **`renderMermaidDiagram(code: string)`**: **async** - Renders Mermaid diagram from code
- **`updatePreview()`**: **async** - Updates diagram preview (debounced)
- **`renderDiagram(code: string)`**: **async** - Wrapper for diagram rendering

##### Error Handling
- **`showError(message: string)`**: Displays error overlay
- **`hideError()`**: Hides error overlay and resets state
- **`handleAutoFixWithAI()`**: **async** - Automatically attempts error fixing
- **`handleFixWithAI()`**: **async** - Manual AI-powered error fixing

##### Export Features
- **`exportToSvg()`**: Exports diagram as SVG file
- **`exportToPng()`**: **async** - Exports diagram as PNG file

##### Zoom Controls
- **`handleZoomButtonClick(delta: number)`**: Handles zoom in/out button clicks

##### Preset System
- **`setupPresets()`**: Initializes preset functionality
- **`populatePresetGrid()`**: Populates preset options based on editor state
- **`selectPreset(prompt: string, isModification: boolean)`**: **async** - Handles preset selection

#### Properties
- **`editor`**: Monaco editor instance (dynamically loaded)
- **`elements`**: DOM element references
- **`aiHandler`**: AI integration handler
- **`collaborationHandler`**: Real-time collaboration handler
- **`panZoomInstance`**: SVG pan/zoom controller
- **`currentError`**: Current error message
- **`autoFixRetryCount`**: Auto-fix attempt counter
- **`MAX_AUTO_FIX_ATTEMPTS`**: Maximum auto-fix attempts (3)

---

### AIHandler

**File**: `src/ai-handler.ts`

Manages Google Gemini AI integration for diagram generation and modification.

#### Constructor
```typescript
constructor(
  editor: any,
  elements: {
    inputField: HTMLTextAreaElement | HTMLInputElement;
    inputArea: HTMLDivElement;
    generationStatus: HTMLSpanElement;
  }
)
```

#### Key Methods

##### Core AI Operations
- **`handleSubmit()`**: **async** - Processes user prompts and generates diagrams
- **`handleStream(response)`**: **async** - Handles streaming AI responses
- **`setLoadingState(loading: boolean)`**: Manages UI loading state

##### Grounding & Context
- **`displayGroundingInfo(metadata: GroundingMetadata)`**: Shows grounding information
- **`getGroundingMetadata()`**: **GroundingMetadata | null** - Returns grounding metadata
- **`hasGroundingSources()`**: **boolean** - Checks if grounding sources exist
- **`getSourceUrls()`**: **string[]** - Returns source URLs from grounding
- **`updateGroundingSettings(enableGrounding, enableUrlContext, threshold)`**: Updates grounding configuration

#### Properties
- **`client`**: GoogleGenAI client instance
- **`editor`**: Monaco editor reference
- **`previousPrompt`**: Last processed prompt
- **`elements`**: UI element references
- **`groundingMetadata`**: Grounding information from AI responses

#### AI Configuration
Uses advanced Gemini 2.5 Pro features:
- **Grounding**: Real-time web search integration
- **URL Context**: Automatic URL content analysis
- **Thinking Budget**: Enhanced reasoning capabilities
- **Streaming**: Real-time response handling

---

### CollaborationHandler

**File**: `src/collaboration.ts`

Handles real-time collaboration using Liveblocks and Y.js CRDT.

#### Constructor
```typescript
constructor(editor: any)
```

#### Key Methods
- **`setup()`**: Initializes collaboration features with room connection

#### Collaboration Features
- **Room-based**: URL parameter-driven room joining
- **CRDT**: Conflict-free collaborative editing via Y.js
- **Awareness**: Real-time cursor and selection sharing
- **User Identity**: Name and color assignment for participants

#### Properties
- **`editor`**: Monaco editor reference

---

## Type Definitions

### EditorState
```typescript
interface EditorState {
  isResizing: boolean;
}
```

### EditorConfig
```typescript
interface EditorConfig {
  minScale: number;
  maxScale: number;
  minWidth: number;
  zoomFactor: number;
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
  exportPngButton: HTMLButtonElement;
  zoomInButton: HTMLButtonElement;
  zoomOutButton: HTMLButtonElement;
  generationStatus: HTMLSpanElement;
}
```

### AIConfig
```typescript
interface AIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  thinkingBudget?: number;
  enableGrounding?: boolean;
  enableUrlContext?: boolean;
  dynamicRetrievalThreshold?: number;
}
```

### GroundingMetadata
```typescript
interface GroundingMetadata {
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
```

## Configuration Constants

### EDITOR_CONFIG
- **`minScale`**: 0.1 - Minimum zoom level
- **`maxScale`**: 3.0 - Maximum zoom level  
- **`minWidth`**: 20 - Minimum editor width percentage
- **`zoomFactor`**: 0.1 - Zoom increment/decrement

### MONACO_CONFIG
- **`language`**: "mermaid" - Custom Mermaid language support
- **`theme`**: "mermaid-dark" - Custom dark theme
- **`fontSize`**: 14 - Editor font size
- **`lineNumbers`**: "on" - Show line numbers
- **`minimap`**: { enabled: false } - Disable minimap
- **`scrollBeyondLastLine`**: false
- **`automaticLayout`**: true
- **`wordWrap`**: "on"

### MERMAID_CONFIG
- **`startOnLoad`**: false - Manual initialization
- **`theme`**: "dark" - Dark theme
- **`securityLevel`**: "loose" - Allow all features
- **`fontFamily`**: "Monaco, 'Cascadia Code', 'Roboto Mono', monospace"

### AI_CONFIG
- **`model`**: "gemini-2.0-flash-exp" - Latest Gemini model
- **`temperature`**: 0.1 - Low randomness for consistent code
- **`maxTokens`**: 8192 - Maximum response length
- **`thinkingBudget`**: 32768 - Enhanced reasoning budget
- **`enableGrounding`**: true - Real-time web search
- **`enableUrlContext`**: true - URL content analysis
- **`dynamicRetrievalThreshold`**: 0.7

## Utility Functions

### File: `src/utils.ts`

#### State Management
- **`debounce(func: Function, wait: number)`**: Debounces function calls
- **`loadDiagramFromURL()`**: **string | null** - Loads diagram from URL hash
- **`generateDiagramHash(code: string)`**: Updates URL hash with compressed diagram

#### Storage
- **`getStoredEditorWidth()`**: **string | null** - Gets saved editor width
- **`setStoredEditorWidth(width: string)`**: Saves editor width to localStorage

#### Collaboration
- **`getRoomIdFromURL()`**: **string | null** - Extracts room ID from URL
- **`getUserNameFromURL()`**: **string** - Gets username from URL or generates default
- **`getRandomColor()`**: **string** - Generates random user color

## Event System

### Editor Events
- **`onDidChangeModelContent`**: Triggers preview updates and URL hash generation (debounced 250ms)

### UI Events
- **Resize**: Mouse-based editor pane resizing
- **Export**: SVG and PNG export functionality
- **Zoom**: Pan and zoom controls for diagrams
- **Settings**: API key management dialog
- **Presets**: Dynamic preset system based on editor state

### AI Events
- **Submit**: Enter key or button click triggers AI generation
- **Streaming**: Real-time code updates during AI response
- **Error Handling**: Automatic and manual error fixing with AI

### Collaboration Events
- **Room Join**: Automatic room joining based on URL parameters
- **Awareness**: Real-time cursor and selection synchronization
- **Document Sync**: CRDT-based collaborative editing

## Error Handling

### Mermaid Syntax Errors
- **Detection**: Parse validation before rendering
- **Display**: Error overlay with clear messaging
- **Recovery**: Auto-fix attempts (max 3) using AI
- **Fallback**: Manual fix option with AI assistance

### AI Integration Errors
- **API Key Validation**: UI warnings for missing/invalid keys
- **Network Errors**: Timeout and retry handling
- **Response Parsing**: Mermaid code extraction from AI responses
- **Rate Limiting**: Graceful degradation and user feedback

### Collaboration Errors
- **Connection Issues**: Fallback to offline mode
- **Sync Conflicts**: CRDT automatic resolution
- **Authentication**: Graceful handling of Liveblocks API errors

## Performance Optimizations

### Lazy Loading
- **Monaco Editor**: Dynamic import reduces initial bundle size
- **Collaboration**: Only loads when room parameter present
- **Mermaid Language**: Loaded after Monaco initialization

### Debouncing
- **Preview Updates**: 250ms debounce for smooth editing
- **URL Hash Updates**: Prevents excessive URL updates
- **Resize Operations**: Smooth resize handle interaction

### Memory Management
- **Event Cleanup**: ResizeObserver and event listener cleanup
- **Image Export**: Blob URL cleanup after PNG export
- **Pan/Zoom**: Instance cleanup on diagram re-render

### Caching
- **Monaco Instance**: Singleton pattern for editor instance
- **User Preferences**: localStorage for settings persistence
- **Diagram State**: URL hash for shareable diagram state