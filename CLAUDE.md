# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

**Development Server**
```bash
bun run dev      # Start development server (user will run this themselves)
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
- **Event-Driven Architecture**: Components communicate via events and observers using `mitt` event bus
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
├── events.ts                 # Central event bus with type-safe event system
└── style.css                 # Application styles
```

## Key Development Patterns

### Event-Driven Architecture
The application uses a central event bus (`eventBus` from `events.ts`) for component communication:
- All events are type-safe through the `AppEvents` interface
- Use `EventHelpers.safeEmit()` to emit events with error handling
- Use `EventHelpers.safeListen()` to subscribe to events with automatic error handling
- Major event categories: `editor:*`, `ai:*`, `diagram:*`, `ui:*`, `collab:*`, `app:*`

### Adding New Features
1. **Configuration**: Add config constants to `config.ts`
2. **Types**: Define TypeScript interfaces in `types.ts`
3. **Events**: Add event types to `AppEvents` in `events.ts` if needed
4. **Implementation**: Add feature logic to appropriate handler class
5. **Integration**: Wire up in `MermaidEditor` class in `main.ts`
6. **UI**: Update HTML and CSS as needed

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
- Supports Google Search grounding and URL context analysis
- System prompt ensures valid Mermaid syntax and encourages colorful diagrams

### Collaboration Architecture
- Room-based collaboration via URL parameters (`?room=name&name=user`)
- Y.js CRDT for conflict-free merging
- Monaco binding for cursor/selection awareness
- Liveblocks as WebSocket transport layer
- Lazy loaded only when `?room` parameter is present

## Important Implementation Notes

### Monaco Editor Integration
- Custom Mermaid language support defined in `configMermaidLanguage.ts`
- Dynamic import pattern used to reduce bundle size
- Custom themes and syntax highlighting for Mermaid diagrams
- Error markers displayed inline with line/column information
- Code action provider for AI-powered quick fixes (Ctrl/Cmd+. on errors)

### Error Handling
- Graceful degradation when AI/collaboration services unavailable
- Mermaid syntax validation with user-friendly error messages
- Network error handling with retry mechanisms
- Error parsing with line/column extraction in `parseMermaidError()`
- Visual error indicators: inline markers, error overlay, and glyph margin

### Performance Optimizations
- Debounced preview updates (250ms delay)
- ResizeObserver for responsive layout
- Memory cleanup for event listeners and observers
- SVG-based diagrams with pan/zoom via `svg-pan-zoom`
- Monaco Editor lazy loading on initialization

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

### Common Patterns
1. **Never run dev server** - User will run `bun run dev` themselves
2. **Use bun, not npm** - All package management uses bun
3. **Avoid util/helper functions** - Keep code simple and direct
4. **Event-driven communication** - Use event bus instead of direct method calls
5. **Lazy loading** - Import Monaco and Collaboration handlers only when needed

### Code Organization
- Handler classes (`AIHandler`, `CollaborationHandler`) are self-contained
- `MermaidEditor` orchestrates initialization and wires up handlers
- Configuration constants centralized in `config.ts`
- All event types defined in `events.ts` for type safety

### Preset System
- Two preset categories: `CREATION_PRESETS` and `MODIFICATION_PRESETS`
- Dynamically switches based on whether editor has content
- Presets auto-populate input field with structured prompts
- Event listener setup uses flag to prevent duplicate registration

### Deployment
- Auto-deploys when code is pushed to repository
- Build process: TypeScript compilation + Vite bundling
- Static site deployment with no backend required