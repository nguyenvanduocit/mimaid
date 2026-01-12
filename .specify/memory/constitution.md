<!--
Sync Impact Report:
- Version: N/A → 1.0.0
- Constitution created from template
- Initial principles established for browser-based editor
- Principles added:
  * I. Event-Driven Architecture (NON-NEGOTIABLE)
  * II. Lazy Loading & Performance
  * III. Simplicity Over Abstraction
  * IV. Client-Side Only Architecture
  * V. Graceful Degradation
  * VI. Type Safety & Error Handling
  * VII. Modern Browser Standards Only
- Templates updated:
  * ✅ .specify/templates/plan-template.md (Constitution Check section populated with specific gates)
  * ✅ .specify/templates/spec-template.md (no changes needed - already aligned)
  * ✅ .specify/templates/tasks-template.md (no changes needed - already aligned)
- Follow-up: None
-->

# MinimalMermaid Constitution

## Core Principles

### I. Event-Driven Architecture (NON-NEGOTIABLE)
Components MUST communicate through the central event bus (`eventBus` from `events.ts`) using type-safe events defined in the `AppEvents` interface. Direct method calls between components are FORBIDDEN except within a single component's internal methods.

**Rationale**: Ensures loose coupling, testability, and maintainability. Prevents tangled dependencies and makes component replacement straightforward.

**Rules**:
- All inter-component communication via `EventHelpers.safeEmit()` and `EventHelpers.safeListen()`
- New features MUST define event types in `AppEvents` interface before implementation
- Event handlers MUST include error handling (automatic with `EventHelpers`)
- Event categories: `editor:*`, `ai:*`, `diagram:*`, `ui:*`, `collab:*`, `app:*`

### II. Lazy Loading & Performance
Features that increase bundle size MUST be lazy loaded. Critical path code MUST remain minimal.

**Rules**:
- Monaco Editor: Dynamic import pattern (REQUIRED)
- CollaborationHandler: Load only when `?room` parameter present (REQUIRED)
- Debounced updates: 250ms for preview rendering (NON-NEGOTIABLE)
- ResizeObserver for responsive layout (REQUIRED)
- Memory cleanup: Remove event listeners and observers on component disposal (NON-NEGOTIABLE)

**Rationale**: Browser-based editor must load quickly and respond smoothly. Users expect instant availability, not lengthy downloads.

### III. Simplicity Over Abstraction
Avoid utility/helper functions. Keep code direct and readable. Configuration over convention.

**Rules**:
- NO generic util/helper modules unless absolutely critical (e.g., `debounce`, `compression`)
- Handler classes (`AIHandler`, `CollaborationHandler`) MUST be self-contained
- Configuration constants centralized in `config.ts` (REQUIRED)
- Use standard browser APIs over third-party libraries when practical
- TypeScript types defined once in `types.ts` (NO duplication)

**Rationale**: Fewer abstractions mean faster comprehension, easier debugging, and lower cognitive load.

### IV. Client-Side Only Architecture
All functionality MUST run entirely in the browser. NO server-side persistence or processing.

**Rules**:
- API keys stored in `localStorage` only (REQUIRED)
- Diagram state persisted in URL hash using LZ-String compression (REQUIRED)
- Collaboration via third-party WebSocket (Liveblocks) (ALLOWED)
- AI integration via direct API calls to Google Gemini (ALLOWED)
- NO backend services, databases, or server-side rendering

**Rationale**: Maintains project simplicity, reduces infrastructure costs, ensures privacy, and enables easy self-hosting.

### V. Graceful Degradation
Features MUST work gracefully when external dependencies fail or are unavailable.

**Rules**:
- AI features: Editor remains functional without API key
- Collaboration: Single-user mode when `?room` parameter absent
- Local Storage unavailable: Fallback to in-memory state
- Network errors: User-friendly messages with retry options
- Mermaid syntax errors: Visual indicators (inline markers, error overlay, glyph margin)

**Rationale**: Users should never encounter a broken application. Core editing functionality must always work.

### VI. Type Safety & Error Handling
TypeScript strict mode REQUIRED. All errors MUST be handled gracefully with user-friendly messages.

**Rules**:
- `strict: true` in `tsconfig.json` (NON-NEGOTIABLE)
- Event interfaces fully typed in `AppEvents` (REQUIRED)
- Error parsing with line/column extraction (REQUIRED for validation errors)
- Monaco error markers for syntax issues (REQUIRED)
- NO silent failures: Log all errors, show user-appropriate messages

**Rationale**: Type safety prevents runtime errors. Proper error handling maintains user trust and enables debugging.

### VII. Modern Browser Standards Only
Target modern browsers with ES2020+ support. NO polyfills or legacy compatibility.

**Rules**:
- ES2020 minimum (REQUIRED)
- WebSocket support (REQUIRED for collaboration)
- Local Storage API (REQUIRED)
- ResizeObserver API (REQUIRED)
- NO IE11 support, NO transpilation to ES5
- Document browser requirements clearly

**Rationale**: Modern APIs provide better performance and developer experience. Legacy support adds unnecessary complexity.

## Development Workflow

### Dependency Management
- Use **bun** exclusively (NEVER npm or yarn)
- All dependencies listed in `package.json`
- Optional dependencies clearly documented (Liveblocks, Google AI)

### Testing Strategy
- Primary validation: Manual testing through web interface
- NO automated testing framework currently configured
- Test integration points: AI responses, collaboration sync, Mermaid rendering
- Browser DevTools for debugging

### Code Organization
- `src/main.ts`: Application entry point and `MermaidEditor` orchestrator
- `src/ai-handler.ts`: Google Gemini AI integration
- `src/collaboration.ts`: Liveblocks + Y.js real-time collaboration
- `src/config.ts`: Configuration constants (MUST be updated for all new configs)
- `src/configMermaidLanguage.ts`: Monaco Editor Mermaid language definition
- `src/types.ts`: TypeScript type definitions (MUST be updated for all new types)
- `src/utils.ts`: Critical utilities only (debounce, compression, storage)
- `src/events.ts`: Event bus and type-safe event definitions
- `src/style.css`: Application styles

### Feature Addition Process
1. **Configuration**: Add constants to `config.ts`
2. **Types**: Define interfaces in `types.ts`
3. **Events**: Add event types to `AppEvents` in `events.ts`
4. **Implementation**: Create handler class or add to existing handler
5. **Integration**: Wire up in `MermaidEditor` class in `main.ts`
6. **UI**: Update HTML and CSS as needed
7. **Testing**: Manual validation through web interface

## Security & Privacy

### API Key Management
- Client-side storage only (localStorage)
- Environment variable fallback for development
- NO server-side API key storage
- NO key transmission to third parties except target API

### Input Sanitization
- AI prompts: Basic sanitization before API calls
- Mermaid code: Validated by Mermaid.js engine
- URL parameters: Validated before use
- NO direct DOM manipulation with user input

### HTTPS Only
- All external API calls MUST use HTTPS
- Collaboration WebSocket via secure WSS protocol
- Document HTTPS requirement for production deployment

## Governance

### Amendment Procedure
1. Propose change with clear rationale in GitHub issue or PR
2. Document impact on existing code and patterns
3. Update constitution version following semantic versioning
4. Propagate changes to templates and CLAUDE.md guidance
5. Update related documentation (README, CLAUDE.md)

### Versioning Policy
- **MAJOR**: Breaking changes to core principles (e.g., adding server-side component)
- **MINOR**: New principle added or existing principle materially expanded
- **PATCH**: Clarifications, wording improvements, typo fixes

### Compliance Review
- Constitution checked during feature planning phase
- Violations MUST be justified in `Complexity Tracking` section
- Simpler alternatives MUST be documented before accepting complexity
- All PRs subject to constitutional compliance verification

### Cross-Artifact Consistency
- Templates at `.specify/templates/` MUST align with constitutional principles
- `CLAUDE.md` guidance file MUST reference current constitution patterns
- Task categorization MUST reflect principle-driven development
- Plan templates MUST include constitution compliance checks

**Version**: 1.0.0 | **Ratified**: 2025-09-30 | **Last Amended**: 2025-09-30