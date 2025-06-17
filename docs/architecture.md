# Architecture Documentation

## System Overview

MinimalMermaid được thiết kế theo kiến trúc modular với separation of concerns rõ ràng. Ứng dụng sử dụng event-driven architecture kết hợp với observer pattern để đảm bảo real-time updates.

## High-Level Architecture

```mermaid
C4Component
    title Component Diagram - MinimalMermaid Editor
    
    Container_Boundary(browser, "Browser Environment") {
        Component(main, "MermaidEditor", "TypeScript Class", "Main application controller")
        Component(monaco, "Monaco Editor", "Code Editor", "Syntax highlighting & editing")
        Component(mermaid, "Mermaid Engine", "Diagram Renderer", "Converts code to SVG")
        Component(ai, "AIHandler", "AI Integration", "Google Genai API client")
        Component(collab, "CollaborationHandler", "Real-time Sync", "Liveblocks + Y.js")
        Component(utils, "Utils", "Helper Functions", "Debounce, compression, storage")
        Component(config, "Configuration", "Settings", "Editor and AI configuration")
    }
    
    Container_Boundary(storage, "Browser Storage") {
        Component(localStorage, "Local Storage", "Persistence", "API keys, preferences")
        Component(url, "URL Hash", "State Sharing", "Compressed diagram state")
        Component(history, "Browser History", "Navigation", "State management")
    }
    
    Container_Boundary(external, "External Services") {
        Component(googleai, "Google AI API", "AI Service", "Gemini model for code generation")
        Component(liveblocks, "Liveblocks", "Collaboration Service", "Real-time synchronization")
    }
    
    Rel(main, monaco, "manages")
    Rel(main, mermaid, "renders with")
    Rel(main, ai, "delegates AI tasks")
    Rel(main, collab, "enables collaboration")
    Rel(main, utils, "uses utilities")
    Rel(main, config, "reads configuration")
    
    Rel(ai, googleai, "generates content", "HTTPS")
    Rel(collab, liveblocks, "syncs state", "WebSocket")
    
    Rel(utils, localStorage, "reads/writes")
    Rel(utils, url, "compresses/decompresses")
    Rel(main, history, "updates")
```

## Data Flow Architecture

```mermaid
flowchart LR
    subgraph "Data Sources"
        A[User Code Input]
        B[URL Hash Parameters]
        C[Local Storage]
        D[AI Generated Content]
        E[Collaboration Data]
    end
    
    subgraph "Processing Layer"
        F[Utils Functions]
        G[Monaco Editor]
        H[AI Handler]
        I[Collaboration Handler]
        J[Mermaid Engine]
    end
    
    subgraph "Data Stores"
        K[Editor State]
        L[Configuration]
        M[Y.Doc Shared State]
        N[Browser History]
    end
    
    subgraph "Output Layer"
        O[SVG Preview]
        P[Error Messages]
        Q[Export Files]
        R[URL Updates]
    end
    
    A --> G
    B --> F
    F --> G
    C --> L
    D --> H
    E --> I
    
    G --> K
    H --> G
    I --> M
    M --> G
    G --> J
    L --> J
    
    J --> O
    J --> P
    K --> N
    F --> R
    O --> Q
```

## Core Components

### MermaidEditor (Main Controller)
- **Responsibility**: Orchestrates toàn bộ ứng dụng
- **Dependencies**: Monaco Editor, Mermaid, AIHandler, CollaborationHandler
- **Key Methods**:
  - `initializeDOM()`: Setup DOM elements
  - `setupEditor()`: Initialize Monaco editor
  - `renderDiagram()`: Render Mermaid diagrams
  - `updatePreview()`: Update preview pane

### AIHandler
- **Responsibility**: Quản lý AI integration
- **Dependencies**: Google Generative AI SDK
- **Key Features**:
  - Stream processing cho real-time generation
  - Context-aware prompts
  - Error handling và retry logic

### CollaborationHandler
- **Responsibility**: Real-time collaboration
- **Dependencies**: Liveblocks, Y.js, y-monaco
- **Key Features**:
  - CRDT-based conflict resolution
  - User awareness (cursors, selections)
  - Room-based collaboration

## State Management

```mermaid
stateDiagram-v2
    [*] --> Initializing
    Initializing --> Editor_Ready : DOM initialized
    Editor_Ready --> Editing : User types code
    Editor_Ready --> AI_Processing : User submits prompt
    Editor_Ready --> Collaboration_Mode : Room parameter exists
    
    Editing --> Preview_Updating : Code changed
    Preview_Updating --> Editing : Preview rendered
    Preview_Updating --> Error_State : Mermaid syntax error
    
    AI_Processing --> Streaming_Response : AI generates content
    Streaming_Response --> AI_Processing : Continue generation
    Streaming_Response --> Editing : Generation complete
    AI_Processing --> Error_State : API error
    
    Collaboration_Mode --> Syncing : Multiple users editing
    Syncing --> Collaboration_Mode : Sync complete
    
    Error_State --> Editing : Error resolved
    
    state Editor_Ready {
        [*] --> Monaco_Loaded
        Monaco_Loaded --> Mermaid_Configured
        Mermaid_Configured --> Event_Listeners_Setup
    }
    
    state AI_Processing {
        [*] --> Loading_State
        Loading_State --> API_Call
        API_Call --> Stream_Processing
    }
```

## Design Patterns

### Observer Pattern
- Monaco Editor events trigger updates
- Debounced event handling cho performance
- Event-driven architecture

### Strategy Pattern
- Multiple render modes (SVG, PNG export)
- Different collaboration strategies
- Configurable AI models

### Singleton Pattern
- Configuration management
- Monaco instance management

### Factory Pattern
- Editor initialization
- Component creation

## Performance Optimizations

### Debouncing
```typescript
const debouncedUpdatePreview = debounce(this.updatePreview.bind(this), 250);
```

### Lazy Loading
```typescript
async function loadMonaco() {
  if (!monacoInstance) {
    const monaco = await import("monaco-editor");
    monacoInstance = monaco;
  }
  return monacoInstance;
}
```

### Compression
- URL state compression với LZ-String
- Efficient diagram sharing

### Memory Management
- Proper cleanup của event listeners
- ResizeObserver optimization

## Security Considerations

### API Key Management
- Local storage only
- Environment variables cho development
- No server-side storage

### Content Security
- Input sanitization
- XSS protection
- HTTPS-only external requests

## Scalability

### Horizontal Scaling
- Stateless design
- Client-side processing
- CDN-friendly assets

### Performance Scaling
- Efficient rendering
- Minimal DOM manipulation
- Optimized bundle size

## Future Architecture Considerations

### Microservices Migration
- AI service separation
- Collaboration service isolation
- Independent deployment

### PWA Features
- Service worker integration
- Offline support
- Background sync

### Plugin Architecture
- Extensible diagram types
- Custom AI providers
- Third-party integrations 