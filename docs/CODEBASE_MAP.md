# CODEBASE_MAP: MinimalMermaid (mimaid)

**Last Updated:** 2025-03-11
**Status:** Current
**Audience:** New engineers, feature owners, refactor owners

## Project Overview

MinimalMermaid is a browser-based Mermaid diagram editor built with TypeScript, Vite, and Monaco Editor. Users create and edit diagrams in real-time with AI-powered generation (Google Gemini, OpenAI, Claude via Vercel AI SDK), optional real-time collaboration (Liveblocks + Y.js), and URL-based diagram sharing using LZ-String compression.

**Key Capabilities:**
- Multi-provider AI diagram generation with streaming responses
- Real-time collaborative editing with cursor awareness
- Full-featured code editor with Mermaid syntax highlighting
- Diagram preview with interactive pan/zoom
- URL-compressed diagram sharing
- Preset-driven generation workflow

## Architecture at a Glance

```
Browser Application
├── MermaidEditor (main.ts) — orchestrator
│   ├── Monaco Editor — code editing
│   │   └── Mermaid language config
│   ├── AIHandler (ai-handler.ts) — multi-provider AI
│   ├── CollaborationHandler (collaboration.ts) — real-time editing
│   ├── Mermaid.js — diagram rendering
│   └── Event System (events.ts) — component communication
├── Configuration (config.ts)
├── Utilities (utils.ts)
└── Type Definitions (types.ts)
```

**No backend.** All computation happens in the browser. API keys stored in localStorage.

## Source Files Reference

### Core Files (3 primary classes)

#### src/main.ts (~1000+ LOC)
**Role:** Application orchestrator and primary UI controller
**Key Class:** `MermaidEditor`

Responsibilities:
- Initialize application (DOM, Monaco, Mermaid, event listeners)
- Manage editor pane/preview pane layout and resizing
- Handle diagram rendering and error display
- Manage preset system (creation vs. modification)
- Implement sharing via URL hash
- Manage zoom/pan controls
- Handle settings UI and API key configuration
- Coordinate with AIHandler and CollaborationHandler

**Entry Points:**
- Constructor initializes DOM and wires up all handlers (line 85–100)
- `initializeApplication()` orchestrates startup sequence
- Event listener setup in `setupEventListeners()` and `setupAppEventListeners()`

**Critical Methods** (sample):
- `renderDiagram(code: string)` — renders Mermaid and handles errors
- `setupPresets()` — wires preset selection UI
- `setupSettingsListeners()` — API key/model configuration
- `handleShare()` — generates shareable URL
- `showFixWithAIOption()` — error quick-fix UI

**Imports:** config, types, AIHandler, CollaborationHandler, utils, events

---

#### src/ai-handler.ts (~400 LOC)
**Role:** Multi-provider AI integration via Vercel AI SDK
**Key Class:** `AIHandler`

Responsibilities:
- Initialize with editor and DOM element references
- Handle AI prompt submission and streaming responses
- Support Google Gemini, OpenAI, and Anthropic via unified interface
- Emit events for progress tracking (`ai:start`, `ai:progress`, `ai:complete`)
- Build context-aware prompts including current diagram code
- Handle streaming text with character-by-character updates

**Entry Points:**
- Constructor sets up event listeners for AI events (line 34–45)
- `handleSubmit()` processes user prompts

**Critical Methods:**
- `getModel(provider, apiKey, modelId)` — provider-specific model factory
- `handleStream(stream)` — processes streaming response
- `buildMessages(prompt, currentCode)` — constructs AI message context

**Dependencies:** Vercel AI SDK (`ai`), provider SDKs (`@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`), config, types, events

**Key Pattern:** Defers provider-specific logic to Vercel AI SDK. No custom provider implementations.

---

#### src/collaboration.ts (~250 LOC)
**Role:** Real-time collaborative editing via Liveblocks + Y.js
**Key Class:** `CollaborationHandler`

Responsibilities:
- Connect to Liveblocks room via URL parameters
- Set up Y.js CRDT for conflict-free document merging
- Bind Monaco editor to Y.js for shared editing
- Manage user awareness (cursors, colors, names)
- Emit collaboration events (`collab:connect`, `collab:user:join/leave`)

**Entry Points:**
- Constructor initializes (line 14–17)
- `setup()` called from MermaidEditor to detect `?room` parameter
- `connectToRoom()` establishes Liveblocks connection

**Critical Methods:**
- `connectToRoom(roomId, userName)` — establishes room and Y.js provider
- Awareness event handlers for user presence

**Dependencies:** Liveblocks client, Y.js, y-monaco binding, utils, events

**Key Pattern:** Only activates if `?room` URL parameter present. Lazy loaded.

---

### Configuration & Types (3 files)

#### src/config.ts (~150 LOC)
**Role:** Centralized configuration constants
**Exports:**
- `EDITOR_CONFIG` — editor constraints (minScale, maxScale, minWidth, zoomFactor)
- `MONACO_CONFIG` — Monaco Editor settings (theme, minimap, lineNumbers, etc.)
- `MERMAID_CONFIG` — Mermaid.js initialization (startOnLoad: false)
- `AI_CONFIG` — AI provider, API key, model, temperature (reads from localStorage)
- `DEFAULT_MODELS` — default model per provider (Gemini 2.5 Pro, GPT-4o, Claude Sonnet)
- `CREATION_PRESETS` — 8 preset prompts for new diagrams (Flowchart, Sequence, Class, Gantt, ER, Git, State, Pie)
- `MODIFICATION_PRESETS` — 8 preset prompts for editing (Simplify, Add Details, Improve Layout, Group, Style, Convert, Fix)

**Usage:** Imported by main.ts and ai-handler.ts

---

#### src/types.ts (~45 LOC)
**Role:** TypeScript type definitions
**Key Types:**
- `EditorState` — isResizing flag
- `EditorConfig` — editor layout constraints
- `EditorElements` — references to all DOM elements
- `AIProviderType` — union type: "google" | "openai" | "anthropic"
- `AIConfig` — provider, apiKey, model, temperature
- `Preset` — title and prompt for preset system
- `MermaidError` — error with message, line, column, severity, source

**Usage:** Imported by main.ts, ai-handler.ts, events.ts, config.ts

---

#### src/events.ts (~95 LOC)
**Role:** Central event bus with type-safe event definitions
**Exports:**
- `eventBus` — mitt event emitter instance
- `AppEvents` — type definition for all event types
- `EventHelpers` — utility functions for safe event emission/listening

**Event Categories:**
- `editor:*` — code changes, errors, readiness
- `ai:*` — generation start/progress/completion/errors
- `diagram:*` — rendering events
- `ui:*` — preset selection, settings, zoom, input submission
- `collab:*` — collaboration connect/disconnect/user join/leave
- `app:*` — app-wide readiness and errors

**Critical Utilities:**
- `EventHelpers.safeEmit(event, data)` — emit with error handling
- `EventHelpers.safeListen(event, handler)` — subscribe with error handling
- `EventHelpers.once(event, handler)` — one-time listener

**Pattern:** All inter-component communication uses events, never direct method calls.

---

### Utilities & Language Config (2 files)

#### src/utils.ts (~150 LOC)
**Role:** Reusable utility functions
**Key Functions:**
- `debounce(func, wait)` — debounce with configurable delay
- `loadDiagramFromURL()` — decompress diagram from URL hash
- `generateDiagramHash(code)` — compress and update URL hash
- `getStoredEditorWidth()` / `setStoredEditorWidth(width)` — localStorage persistence
- `getRoomIdFromURL()` — extract `?room` parameter
- `getUserNameFromURL()` — extract `?name` parameter or generate random
- `parseMermaidError(errorString)` — parse Mermaid error messages into structured format
- `inferErrorLine(errorString)` — extract line number from error
- `hasCommonSyntaxIssues(code)` — detect common Mermaid syntax problems
- `cleanErrorMessage(message)` — user-friendly error text
- `getRandomColor()` — generate random RGB for collaboration awareness

**Dependencies:** LZ-String for compression

---

#### src/configMermaidLanguage.ts (~300 LOC)
**Role:** Monaco Editor language support for Mermaid
**Exports:**
- `configureMermaidLanguage(monaco)` — registers custom language with Monaco

**Capabilities:**
- Syntax highlighting for all Mermaid diagram types (flowchart, sequence, class, state, ER, Gantt, pie, git, timeline, mindmap, requirement, C4)
- Tokenization rules for keywords, strings, comments, syntax
- Autocomplete suggestions for Mermaid syntax
- Custom Monaco theme ("mermaid") with diagram-appropriate colors
- Code action provider for quick fixes on error lines

**Pattern:** Dynamically imported only after Monaco loads (lazy loading pattern).

---

### Data Files (1 file)

#### src/skill-content.ts
**Role:** Claude Code skill content loader
**Exports:**
- `SKILL_CONTENT` — raw markdown content for Claude Code skill integration

**Pattern:** Imported as raw text to provide AI context within Claude Code environment.

---

## Dependency Graph

### Direct Dependencies

```
main.ts
├── mermaid
├── svg-pan-zoom
├── Monaco Editor (dynamic import)
├── configMermaidLanguage.ts (dynamic import)
├── config.ts → AI_CONFIG, CREATION_PRESETS, MODIFICATION_PRESETS
├── types.ts → EditorState, EditorElements, etc.
├── ai-handler.ts
├── collaboration.ts
├── utils.ts → debounce, loadDiagramFromURL, etc.
├── events.ts → eventBus, EventHelpers
└── skill-content.ts

ai-handler.ts
├── Vercel AI SDK (ai)
├── @ai-sdk/google → Google Gemini
├── @ai-sdk/openai → OpenAI
├── @ai-sdk/anthropic → Anthropic Claude
├── config.ts → AI_CONFIG, DEFAULT_MODELS
├── types.ts → AIProviderType, AIConfig
└── events.ts → EventHelpers

collaboration.ts
├── @liveblocks/client
├── @liveblocks/yjs → LiveblocksYjsProvider
├── yjs → Y.Doc, Y.Text
├── y-monaco → MonacoBinding
├── y-protocols/awareness
├── utils.ts → getRoomIdFromURL, getUserNameFromURL, getRandomColor
└── events.ts → EventHelpers

configMermaidLanguage.ts
└── monaco-editor (passed in at runtime)

config.ts
└── types.ts → EditorConfig, AIConfig, AIProviderType

types.ts
└── (no internal dependencies)

events.ts
├── mitt
└── types.ts → Preset, AIProviderType

utils.ts
├── lz-string
└── types.ts → MermaidError

skill-content.ts
└── ./skill-content.md (raw markdown)
```

### External Dependencies

**Core:**
- `vite` — build tool
- `typescript` — language
- `vite-plugin-monaco-editor` — Vite integration for Monaco

**Editor & Rendering:**
- `monaco-editor` — code editor
- `mermaid` — diagram rendering
- `svg-pan-zoom` — diagram pan/zoom

**AI Integration:**
- `ai` — Vercel AI SDK (streaming)
- `@ai-sdk/google` — Google Gemini provider
- `@ai-sdk/openai` — OpenAI provider
- `@ai-sdk/anthropic` — Anthropic Claude provider

**Collaboration:**
- `@liveblocks/client` — WebSocket transport
- `@liveblocks/yjs` — Liveblocks + Y.js adapter
- `yjs` — CRDT implementation
- `y-monaco` — Monaco editor binding for Y.js
- `y-protocols` — Awareness protocol

**Utilities:**
- `lz-string` — URL compression
- `mitt` — event emitter

## Critical Paths

### Path 1: AI Generation (Happy Path)

```
User submits prompt
  ↓
AIHandler.handleSubmit() — validates input, emits ai:start
  ↓
AIHandler.handleStream() — streams response character by character
  ↓
Emits ai:progress with partial code → MermaidEditor re-renders preview
  ↓
Emits ai:complete with final code → MermaidEditor updates editor
  ↓
MermaidEditor.renderDiagram() → Mermaid.render() → SVG preview
```

**Error Handling:** If Mermaid syntax invalid, error parsed by `parseMermaidError()`, displayed in editor glyph margin + error overlay. "Fix with AI" option shown.

---

### Path 2: Preset Selection

```
User clicks preset (Creation or Modification)
  ↓
Event: ui:preset:select { preset, isModification }
  ↓
If modification: append current diagram code to prompt
  ↓
AIHandler receives modified prompt → handleSubmit() → AI generation
```

---

### Path 3: Collaborative Editing

```
User loads with ?room=name&name=user
  ↓
CollaborationHandler.setup() detects room parameter
  ↓
Emits collab:connect → connectToRoom() establishes Liveblocks connection
  ↓
Y.js document created, Monaco editor bound to Y.js via y-monaco
  ↓
All edits synced via CRDT → conflict-free merging
  ↓
User awareness (cursor, color, name) broadcast via awareness protocol
```

---

### Path 4: URL Sharing

```
User creates/edits diagram
  ↓
On every change: generateDiagramHash(code) compresses and updates #hash
  ↓
User copies URL with compressed state
  ↓
New user loads URL → loadDiagramFromURL() decompresses → editor populated
```

---

## State Management

### Editor State
- **Location:** Monaco Editor instance
- **What:** Current diagram code, cursor position, selection
- **Lifecycle:** Lives in Monaco instance, not synchronized except via events

### Application State
- **Location:** MermaidEditor class properties (line 74–83)
- **What:** isResizing flag, current error, pending error, preset setup flag
- **Lifecycle:** Instance variables, cleared on navigation

### Collaboration State
- **Location:** Y.js document (`yDoc`) + Liveblocks room
- **What:** Shared diagram code, user awareness (cursors, names, colors)
- **Lifecycle:** Remote, synced via Y.js CRDT + WebSocket

### Persistent State
- **Location:** localStorage
- **What:** API key, provider, model, editor width, theme preference
- **Lifecycle:** Survives page reload

### URL State
- **Location:** Window location hash
- **What:** Compressed diagram code
- **Lifecycle:** Updated on edit, shareable via link

---

## Error Handling

### Error Types & Handling

**Mermaid Syntax Errors:**
- Caught by Mermaid.render()
- Parsed by `parseMermaidError()` (utils.ts)
- Extracted: line number, column, message, severity
- Displayed: inline Monaco decorations + error overlay + glyph margin
- Resolution: "Fix with AI" button → AIHandler.handleFixWithAI() → AI generates corrected code

**AI Service Errors:**
- Network errors, API quota exceeded, invalid API key
- Caught in AIHandler.handleStream()
- Emitted as `ai:error` event
- Toast notification shown to user
- Graceful fallback: show error message, disable submission until resolved

**Collaboration Errors:**
- Liveblocks connection failure
- Emitted as `collab:error` (if listener present)
- Falls back to local editing (collaboration disabled)

**Application Errors:**
- Caught in EventHelpers.safeListen() wrapper
- Emitted as `app:error` event
- Logged to console for debugging

---

## Key Design Patterns

### 1. Event-Driven Architecture
All inter-component communication flows through `eventBus` (events.ts). No direct method calls between handlers.

**Pattern:**
```ts
// Emit
EventHelpers.safeEmit("ai:complete", { code });

// Listen
EventHelpers.safeListen("ai:complete", ({ code }) => {
  renderDiagram(code);
});
```

**Benefit:** Loose coupling, easy to extend, testable in isolation

---

### 2. Lazy Loading
Monaco Editor and collaboration features loaded only when needed.

**Pattern:**
```ts
async function loadMonaco() {
  if (!monacoInstance) {
    monacoInstance = await import("monaco-editor");
  }
  return monacoInstance;
}
```

**Benefit:** Reduces initial bundle, speeds up first render

---

### 3. Debounced Updates
Preview re-renders debounced to avoid excessive Mermaid.render() calls.

**Pattern:**
```ts
const debouncedRender = debounce(() => renderDiagram(code), 250);
editor.onDidChangeModelContent(() => debouncedRender());
```

**Benefit:** Smooth user experience, reduced CPU usage

---

### 4. Multi-Provider AI Abstraction
Vercel AI SDK provides unified interface for Google Gemini, OpenAI, Anthropic.

**Pattern:**
```ts
const model = getModel(provider, apiKey, modelId);
await streamText({ model, prompt });
```

**Benefit:** Easy to switch providers, minimal code duplication

---

### 5. Preset-Driven Generation
Two preset categories (creation vs. modification) auto-selected based on editor state.

**Pattern:**
```ts
if (editorEmpty) showPresets(CREATION_PRESETS);
else showPresets(MODIFICATION_PRESETS);
```

**Benefit:** Guided user experience, consistent prompt quality

---

## What to Change Where

### Add New AI Provider
1. Add to `AIProviderType` union (src/types.ts)
2. Add default model (src/config.ts, DEFAULT_MODELS)
3. Update `getModel()` function (src/ai-handler.ts)
4. Add provider SDK to dependencies (package.json)

### Add New Preset
1. Add to `CREATION_PRESETS` or `MODIFICATION_PRESETS` (src/config.ts)
2. UI automatically reflects in preset selector

### Customize Mermaid Syntax Highlighting
1. Modify tokenizer rules in `configureMermaidLanguage()` (src/configMermaidLanguage.ts)
2. Add keywords to appropriate diagram type object

### Add New Diagram Rendering Format
1. Extend Mermaid diagram rendering in `renderDiagram()` (src/main.ts)
2. Update `configMermaidLanguage()` if new syntax keywords needed

### Change Error Display
1. Modify error parsing in `parseMermaidError()` (src/utils.ts)
2. Update error overlay UI in `setupErrorHandling()` (src/main.ts)
3. Customize glyph margin decorations in `renderDiagram()`

### Modify Collaboration Feature
1. Room connection logic: `CollaborationHandler.connectToRoom()` (src/collaboration.ts)
2. Awareness/cursor display: awareness event handlers
3. Provider switch: update Liveblocks client initialization

---

## Architectural Concerns & Improvements

### High-Complexity Areas

**MermaidEditor class (main.ts):**
- 60+ methods, cognitive complexity ~318
- Risk: Difficult to navigate, test, and modify
- **Recommendation:** Extract into focused handler classes (SettingsHandler, ShareHandler, PresetHandler, ErrorDisplayHandler)

**AIHandler (ai-handler.ts):**
- Manages UI state updates during streaming
- Tight coupling to DOM elements
- **Recommendation:** Separate UI update logic into dedicated view class

**CollaborationHandler setup (collaboration.ts):**
- Complex awareness event handling
- Y.js binding setup
- **Recommendation:** Extract into separate AwarenessManager class

### Temporal Coupling

**main.ts ↔ types.ts:**
- Types always change together with main.ts
- **Observation:** Types are tightly versioned with MermaidEditor
- **Mitigation:** Keep types.ts stable; avoid adding type changes for single use cases

---

## Testing Strategy (Current: None)

**No testing framework configured.** Manual testing via web interface.

**Critical Paths for Unit Tests (if framework added):**
1. `parseMermaidError()` — error parsing edge cases
2. `getModel()` — provider selection logic
3. Preset selection logic — creation vs. modification
4. URL compression/decompression — hash round-trip
5. Event emission/listening — event bus behavior

**Critical Paths for Integration Tests:**
1. AI generation flow — prompt → streaming → render
2. Collaboration sync — multi-user edits
3. Settings persistence — localStorage round-trip

---

## Deployment & Build

**Build Command:** `bun run build`
- TypeScript compilation: `tsc`
- Vite bundling: `vite build`

**Output:** Static files (HTML, JS, CSS) to `dist/`

**Deployment:** Auto-deploys on push to repository (CI/CD configured externally)

**Environment Variables:**
```bash
VITE_LIVEBLOCKS_PUBLIC_API_KEY=<public-key>  # Optional: collaboration
VITE_GOOGLE_AI_API_KEY=<api-key>             # Optional: fallback AI
```

---

## Known Unknowns

1. **Deployment Target:** No deployment configuration found (Netlify, Vercel, Cloudflare Pages, etc.). Assumed static hosting but unverified.

2. **Liveblocks Room Lifecycle:** No room cleanup or TTL logic found. Verify dashboard configuration for room limits/expiration.

3. **API Key Security:** Keys stored client-side in localStorage. No server-side proxy. Verify CORS headers protect against key theft.

4. **Monaco Bundle Size:** Dynamic import reduces initial load but full impact unquantified. Run `bun run build && du -sh dist/` to measure.

5. **Mermaid Version Lock:** Pinned to v11.9.0. Verify syntax compatibility if upgrading.

---

## File Structure

```
mimaid/
├── src/
│   ├── main.ts                    # MermaidEditor orchestrator
│   ├── ai-handler.ts              # AI integration (Vercel AI SDK)
│   ├── collaboration.ts           # Real-time editing (Liveblocks + Y.js)
│   ├── config.ts                  # Configuration constants
│   ├── types.ts                   # TypeScript type definitions
│   ├── events.ts                  # Central event bus (mitt)
│   ├── configMermaidLanguage.ts   # Monaco Mermaid language support
│   ├── utils.ts                   # Utility functions
│   ├── skill-content.ts           # Claude Code skill content
│   ├── style.css                  # Application styles
│   ├── modern-normalize.css       # CSS reset
│   └── vite-env.d.ts              # Vite environment types
├── package.json                   # Dependencies, scripts
├── vite.config.ts                 # Vite build configuration
├── tsconfig.json                  # TypeScript configuration
├── CLAUDE.md                       # Development guidance
├── index.html                      # Entry HTML
└── docs/                           # Documentation
    ├── CODEBASE_MAP.md            # This file
    ├── c4-architecture.md         # Architecture diagrams
    ├── key-flows.md               # Critical execution paths
    ├── dependency-graph.md        # Dependency analysis
    ├── infrastructure.md          # Build & deployment
    └── product-requirements.md    # Feature traceability
```

---

## Quick Reference: Make a Change

| Task | File(s) | Pattern |
|------|---------|---------|
| Add AI provider | types.ts, config.ts, ai-handler.ts | Extend union + factory |
| Add preset | config.ts | Add to array |
| Fix error display | main.ts, utils.ts | Customize parsing + UI |
| Change editor settings | config.ts, configMermaidLanguage.ts | Modify constants |
| Add event type | events.ts | Extend AppEvents + emit site |
| Add collaboration feature | collaboration.ts | Extend awareness or room logic |
| Customize diagram styling | main.ts (renderDiagram), configMermaidLanguage.ts | Modify CSS + theme |

---

## Verification Checklist

- [x] All 9 source files identified and categorized
- [x] 3 primary classes (MermaidEditor, AIHandler, CollaborationHandler) documented
- [x] 6 supporting modules explained (config, types, events, utils, configMermaidLanguage, skill-content)
- [x] Dependency graph complete
- [x] Critical execution paths traced
- [x] State management explained
- [x] Error handling patterns described
- [x] Design patterns documented
- [x] High-complexity areas identified
- [x] Testing gaps noted
- [x] Known unknowns captured

---

**Oracle Metadata**

- **Document Type:** Codebase Index
- **Scope:** Complete source code mapping + architectural overview
- **Maintainability Index:** 78.6 (average across all files)
- **Circular Dependencies:** 0
- **Primary Hubs:** MermaidEditor (god class), AIHandler, CollaborationHandler
- **Test Coverage:** None (manual testing only)
- **Last Verified:** 2025-03-11
