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
- `AIHandler`: Prompts the user's agent for diagram generation and streams the reply into the editor
- `Agentd`: The agentd daemon connection (detect, connect, selected agent) and the one open ACP chat
- `CollaborationHandler`: Handles real-time collaboration via Liveblocks + Y.js
- `Monaco Editor`: Code editor with custom Mermaid language support
- `pele`: Mermaid-syntax to SVG renderer (`render()` throws `PeleError` with line/column on invalid syntax)

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
├── agentd.ts                 # agentd connection state, panel model, selected agent, open chat
├── agent-chat.ts             # ACP session over a stream: streams text, cancels tool permissions
├── ai-handler.ts             # Diagram generation through the agent chat
├── ai-prompt.ts              # Agent prompt (instructions + current diagram) and mermaid block extraction
├── collaboration.ts          # Real-time collaboration via Liveblocks/Y.js
├── config.ts                 # Configuration constants (editor, AI, Mermaid)
├── configMermaidLanguage.ts  # Monaco Editor Mermaid language definition (themes, completions)
├── mermaid-highlight.ts      # Syntax tokenizer copied from pele (MIT); keep close to upstream
├── mermaid-tokens.ts         # Monaco token adapter; colors the keywords of the declared diagram
├── mermaid-keywords.ts       # Keywords per diagram type (autocomplete + highlighting)
├── webmcp.ts                 # WebMCP tools on document.modelContext (agents read/write/share diagrams)
├── types.ts                  # TypeScript type definitions
├── utils.ts                  # Utility functions (debounce, compression, storage)
├── events.ts                 # Central event bus with type-safe event system
└── style.css                 # Application styles
```

## WebMCP
`src/webmcp.ts` registers tools on `document.modelContext` (spec shape: `registerTool(tool, { signal })`, `execute` returns a string). `createWebMcpTools(app)` is pure and takes `getCode`/`setCode`, so tests run without Monaco; `main.ts` wires it in `setupEditor()`. A new capability for agents = one more entry in `createWebMcpTools` plus a row in the README table. Tool names, descriptions and schemas are what agents see, so keep them precise. Mark side-effecting tools `consequentialHint`, pure reads `readOnlyHint`.

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
- **Persistence**: Local Storage for the selected agent and preferences, URL hash for diagram sharing

### AI Integration Details
- AI runs on the user's computer through agentd (`@agentd/client`, pinned to a release file in `package.json`) in browser mode: the page asks the daemon for a grant (its dialog also asks for a folder), opens a session with an agent (Claude Code, Codex, Grok) and speaks ACP (`@agentclientprotocol/sdk`) over the session's streams
- `agent-chat.ts` takes any ACP `Stream`, so tests run it against a fake agent over in-memory streams; `agentd.ts` holds the pure state logic (`readyAgents`, `pickAgent`, `panelOf`) beside the `Agentd` class that owns I/O
- One chat stays open across prompts; each prompt carries the instructions and the current diagram (`buildAgentPrompt`), so the agent keeps no state the editor does not show
- The reply streams as `session/update` message chunks; `extractMermaid` reads the first ```mermaid block as it arrives
- The prompt tells the agent not to use tools and the page answers every `session/request_permission` with "cancelled". An agent whose own mode asks for no permission (Claude Code reports `mode: auto`) is not stopped by that, so the folder the user picks in agentd's dialog is the real boundary
- The model is the agent's own config option (`category: "model"` in `session/new`'s `configOptions`, switched with `session/set_config_option`); `openAgentChat` returns it as `chat.model`, and the choice is kept per agent in localStorage (`agentdModel:<agent>`). The panel lists models while it is open, since they come from a running session
- The settings panel is a function of the connection state (`panelOf`); the page looks for the daemon when the panel opens, or at load when the user connected before (the browser asks before a page reaches a local program)
- The agentd origin rule applies: the page's origin is https or loopback http

### Collaboration Architecture
- Room-based collaboration via URL parameters (`?room=name&name=user`)
- Y.js CRDT for conflict-free merging
- Monaco binding for cursor/selection awareness
- Liveblocks as WebSocket transport layer
- Lazy loaded only when `?room` parameter is present

## Important Implementation Notes

### Monaco Editor Integration
- Custom Mermaid language support defined in `configMermaidLanguage.ts`; syntax highlighting comes from `mermaid-highlight.ts` + `mermaid-tokens.ts` via `setTokensProvider`; keywords per diagram live in `mermaid-keywords.ts`
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
- No AI credentials in the page: the agent on the user's computer holds them
- No server-side data persistence
- Input sanitization for AI prompts
- The page reaches agentd only on `127.0.0.1`; a grant lasts 30 days

## Environment Setup

### Required Environment Variables
```bash
VITE_LIVEBLOCKS_PUBLIC_API_KEY=your_liveblocks_key  # Optional: for collaboration
```

### Browser Compatibility
- Modern browsers with ES2022 support (`String.prototype.at`/`replaceAll`)
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