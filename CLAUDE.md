# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

**Development Server**
```bash
bun run dev      # Start development server on http://localhost:5173
```

**Build & Deployment**
```bash
bun install      # Install dependencies
bun run build    # Build for production (runs TypeScript compilation + Vite build)
bun run preview  # Preview production build locally
```

**Testing**
- No testing framework is currently configured
- Manual testing through the web interface is the primary validation method

## Project Architecture

### Core Architecture
MinimalMermaid is a browser-based Mermaid diagram editor built with TypeScript, Vite, and Monaco Editor. The architecture follows a modular event-driven design with clear separation of concerns:

**Main Components:**
- `MermaidEditor`: Main application controller that orchestrates all components
- `AIHandler`: Manages Google Gemini AI integration for diagram generation
- `CollaborationHandler`: Handles real-time collaboration via Liveblocks + Y.js
- `Monaco Editor`: Code editor with custom Mermaid language support
- `Mermaid.js`: Diagram rendering engine

### Key Technical Patterns
- **Lazy Loading**: Monaco Editor is dynamically imported to reduce initial bundle size
- **Debounced Updates**: Preview updates are debounced (250ms) for performance
- **Event-Driven Architecture**: Components communicate via events and observers
- **State Compression**: Diagram state is compressed in URL hash using LZ-String
- **CRDT Collaboration**: Uses Y.js for conflict-free collaborative editing

### File Structure Overview
```
src/
├── main.ts                    # Application entry point & MermaidEditor class
├── ai-handler.ts             # Google Gemini AI integration
├── collaboration.ts          # Real-time collaboration via Liveblocks/Y.js
├── config.ts                 # Configuration constants (editor, AI, Mermaid)
├── configMermaidLanguage.ts  # Monaco Editor Mermaid language definition
├── types.ts                  # TypeScript type definitions
├── utils.ts                  # Utility functions (debounce, compression, storage)
└── style.css                 # Application styles
```

## Key Development Patterns

### Adding New Features
1. **Configuration**: Add config constants to `config.ts`
2. **Types**: Define TypeScript interfaces in `types.ts`
3. **Implementation**: Add feature logic to appropriate handler class
4. **Integration**: Wire up in `MermaidEditor` class in `main.ts`
5. **UI**: Update HTML and CSS as needed

### State Management
- **Editor State**: Managed by Monaco Editor instance
- **Application State**: Simple object-based state in `MermaidEditor`
- **Collaboration State**: Y.js shared document for multi-user editing
- **Persistence**: Local Storage for API keys and preferences, URL hash for diagram sharing

### AI Integration Details
- Uses Google's Gemini 2.5 Pro model via `@google/genai`
- Streaming responses for real-time code generation
- Context-aware prompts that include current diagram code
- API key stored in localStorage with fallback to environment variables

### Collaboration Architecture
- Room-based collaboration via URL parameters (`?room=name&name=user`)
- Y.js CRDT for conflict-free merging
- Monaco binding for cursor/selection awareness
- Liveblocks as WebSocket transport layer

## Important Implementation Notes

### Monaco Editor Integration
- Custom Mermaid language support defined in `configMermaidLanguage.ts`
- Dynamic import pattern used to reduce bundle size
- Custom themes and syntax highlighting for Mermaid diagrams

### Error Handling
- Graceful degradation when AI/collaboration services unavailable
- Mermaid syntax validation with user-friendly error messages
- Network error handling with retry mechanisms

### Performance Optimizations
- Debounced preview updates (250ms delay)
- ResizeObserver for responsive layout
- Memory cleanup for event listeners and observers
- SVG-based diagrams with pan/zoom via `svg-pan-zoom`

### Security Considerations
- API keys stored client-side only (localStorage)
- No server-side data persistence
- Input sanitization for AI prompts
- HTTPS-only external API calls

## Environment Setup

### Required Environment Variables
```bash
VITE_LIVEBLOCKS_PUBLIC_API_KEY=your_liveblocks_key  # Optional: for collaboration
VITE_GOOGLE_AI_API_KEY=your_google_ai_key          # Optional: fallback for AI features
```

### Browser Compatibility
- Modern browsers with ES2020 support
- WebSocket support required for collaboration
- Local Storage required for settings persistence

## URL Parameters
- `?room=name` - Enable collaboration mode
- `?name=username` - Set display name for collaboration
- `?hideEditor` - View-only mode (hide editor pane)
- Hash fragment contains compressed diagram code for sharing

## Development Insights

### Common Patterns and Guidance
- Never need to run dev

### Deployment
- The project auto deploy when code push