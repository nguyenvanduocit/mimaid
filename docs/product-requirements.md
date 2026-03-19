# Product Requirements: MinimalMermaid (Mimaid)

**Version:** 1.0
**Last Updated:** March 11, 2026
**Audience:** Product Owners, Feature Developers, Architecture Planners

## Product Overview

MinimalMermaid (Mimaid) is a lightweight, browser-based Mermaid diagram editor designed for creating, editing, and sharing diagrams with AI-powered assistance and real-time collaboration. The product targets developers and technical teams who need quick diagram generation without heavyweight desktop tools.

**Key Value Proposition:** Create and refine Mermaid diagrams faster using AI, collaborate in real-time, and share with a simple URL.

---

## Functional Requirements

### FR-1: Mermaid Code Editing

**Status:** Implemented

The application provides a professional code editor experience specifically tailored for Mermaid diagram syntax.

**Code Reference:** `src/configMermaidLanguage.ts:1-40`

**Features:**
- **Language Support:** 18 diagram types with syntax highlighting
  - Flowchart (`flowchart`, `graph`) (`src/configMermaidLanguage.ts:24-26`)
  - Sequence Diagram (`sequenceDiagram`) (`src/configMermaidLanguage.ts:60-98`)
  - Class Diagram (`classDiagram`, `classDiagram-v2`) (`src/configMermaidLanguage.ts:100-130`)
  - State Diagram (`stateDiagram`, `stateDiagram-v2`) (`src/configMermaidLanguage.ts:132-149`)
  - Entity Relationship (`erDiagram`) (`src/configMermaidLanguage.ts:151-175`)
  - Gantt Chart (`gantt`) (`src/configMermaidLanguage.ts:186-210`)
  - Git Graph (`gitGraph`) (`src/configMermaidLanguage.ts:231-260`)
  - Pie Chart (`pie`) (`src/configMermaidLanguage.ts:262-272`)
  - Journey (`journey`) (`src/configMermaidLanguage.ts:176-179`)
  - Timeline (`timeline`) (`src/configMermaidLanguage.ts:14-17`)
  - Mindmap (`mindmap`) (`src/configMermaidLanguage.ts:19-22`)
  - Requirement Diagram (`requirement`, `requirementDiagram`) (`src/configMermaidLanguage.ts:212-229`)
  - C4 Diagram (5 variants: `C4Context`, `C4Container`, `C4Component`, `C4Dynamic`, `C4Deployment`) (`src/configMermaidLanguage.ts:274-332`)
  - Quadrant Chart (`quadrantChart`) (`src/configMermaidLanguage.ts:335-346`)
  - XY Chart (`xychart-beta`) (`src/configMermaidLanguage.ts:348-351`)
  - Sankey Diagram (`sankey-beta`) (`src/configMermaidLanguage.ts:353-356`)
  - Architecture Diagram (`architecture-beta`) (`src/configMermaidLanguage.ts:358-370`)

- **Code Completion:** 15+ snippet templates for common structures (`src/configMermaidLanguage.ts:869-1012`)
  - Block keywords: `loop`, `alt`, `opt`, `par`, `rect`, `subgraph`, `class`, `state`, `note`, `section`, `element`, `options`
  - C4 boundaries: `Boundary`, `Enterprise_Boundary`, `System_Boundary`, `Container_Boundary`
  - Requirement types: `requirement`, `functionalRequirement`, `interfaceRequirement`, `performanceRequirement`, `physicalRequirement`, `designConstraint`

- **Theme:** Custom "mermaid" theme with organic soft palette (`src/configMermaidLanguage.ts:835-866`)
  - Background: `#fdfbf7` (warm cream)
  - Primary accent: `#6a9a6a` (sage green)
  - Secondary accent: `#8fb38f` (light green)
  - Text: `#2d3436` (charcoal)

- **Language Configuration:** Auto-closing brackets and Mermaid-style comment support (`%%`) (`src/configMermaidLanguage.ts:1025-1040`)

**Design Decision:** Monaco Editor provides enterprise-grade editing with custom language support, chosen for reliability over lightweight alternatives.

---

### FR-2: Real-time Diagram Preview

**Status:** Implemented

The application renders diagrams in real-time as users edit code, with visual feedback and error reporting.

**Code Reference:** `src/main.ts`, `src/utils.ts:94-147`

**Features:**
- **Debounced Rendering:** Preview updates delayed 250ms after each keystroke to prevent excessive re-renders
- **Mermaid.js v11:** SVG-based diagram rendering enforced via system prompt (`src/ai-handler.ts:159-161`)
- **Pan & Zoom:** Interactive canvas using svg-pan-zoom library with configurable scale limits (`src/config.ts:6-11`)
  - Min scale: 0.5x
  - Max scale: 20x
  - Zoom factor: 0.1x per click
- **Visual Design:** Dot-grid background on preview pane (from git history: `be0c275`)
- **Error Display:** Two-layer error visualization
  - Inline markers in editor glyph margin (line and column indicators)
  - Error overlay panel in preview pane displaying formatted error message

**Performance:** Debouncing ensures preview updates don't block editor responsiveness on large diagrams.

---

### FR-3: AI-Powered Diagram Generation

**Status:** Implemented

AI integration enables users to generate and modify diagrams from natural language descriptions.

**Code Reference:** `src/ai-handler.ts:12-227`, `src/config.ts:59-145`

**Multi-Provider Support:**
- **Google Gemini:** Default provider, model `gemini-2.5-pro` (`src/config.ts:16-19`)
- **OpenAI:** Model `gpt-4o` (`src/config.ts:16-19`)
- **Anthropic Claude:** Model `claude-sonnet-4-20250514` (`src/config.ts:16-19`)

**Streaming Response:** Real-time code generation with incremental editor updates (`src/ai-handler.ts:192-227`)
- Extracts Mermaid code from markdown code blocks (markers: ````mermaid` / ````)
- Updates editor incrementally as tokens arrive
- Handles stream completion and error propagation via Promise.all (`src/ai-handler.ts:88-101`)

**Context Awareness:** Current diagram code included in AI prompts for modification requests (`src/ai-handler.ts:121-140`)
- For modifications: appends current diagram to messages array
- Assistant acknowledges understanding before receiving new prompt

**System Prompt (v11 Syntax Enforced):** `src/ai-handler.ts:142-174`
- Explicitly bans Markdown in Mermaid labels (90% of user-reported errors)
- Enforces valid Mermaid v11 syntax with shape notation: `@{ shape: diamond, label: "..." }`
- Teaches styling via CSS instead of Markdown emphasis
- Pre-check: AI scans for `**`, `*`, `_`, `[]`, ` `` ` characters before output

**Creation Presets:** 8 templates for new diagrams (`src/config.ts:59-100`)
1. Flowchart (auth process)
2. Sequence Diagram (client-server-database)
3. Class Diagram (e-commerce system)
4. Gantt Chart (2-month project)
5. Entity Relationship (blog system)
6. Git Graph (feature branch workflow)
7. State Diagram (order processing)
8. Pie Chart (programming languages distribution)

**Modification Presets:** 8 templates for transforming existing diagrams (`src/config.ts:105-145`)
1. Simplify (remove details, focus core)
2. Add Details (expand elements)
3. Improve Layout (better visual organization)
4. Group Elements (use subgraphs/containers)
5. Add Colors & Styling (visual enhancements)
6. Convert to Flowchart (format conversion)
7. Convert to Sequence (format conversion)
8. Fix & Optimize (syntax + readability)

**Preset Switching Logic:** (`src/ai-handler.ts:53-70`)
- Shows creation presets when editor is empty
- Switches to modification presets when editor has content
- Auto-populates input field with preset prompt
- Events: `ui:input:submit`, `ui:preset:select`

**Error Handling:** (`src/ai-handler.ts:177-185`)
- Catch block captures network, parsing, and API errors
- Emits `ai:error` event with user-friendly message
- Displays toast notification of failure

**Design Decision:** Streaming response chosen to provide immediate visual feedback on diagram generation, critical for user confidence in AI quality.

---

### FR-4: Real-time Collaboration

**Status:** Implemented

Multiple users can edit the same diagram simultaneously with conflict-free merging.

**Code Reference:** `src/collaboration.ts:1-87`

**URL-Based Rooms:** Room parameter enables collaboration mode (`src/utils.ts:66-68`)
- Query parameter: `?room=roomname`
- User name parameter: `?name=username` (defaults to `User {random}`)
- Examples:
  - `https://mimaid.app?room=team-project&name=Alice`
  - `https://mimaid.app?room=team-project&name=Bob`

**CRDT Conflict Resolution:** Y.js library handles concurrent edits (`src/collaboration.ts:49-51`)
- Shared document type: `Y.Text` (character-by-character sync)
- Provider: LiveblocksYjsProvider (WebSocket transport)

**Cursor & Selection Awareness:** (`src/collaboration.ts:64-69`)
- MonacoBinding integrates Y.js with Monaco Editor
- Users see remote cursors with color indicators
- Awareness protocol tracks user presence and state

**User Presence:** (`src/collaboration.ts:54-61`)
- Each user gets random hex color (`src/utils.ts:84-86`)
- Name stored in awareness state
- Change events emit `collab:user:join` to update UI

**Lazy Loading:** Collaboration only initializes if `?room` parameter present (`src/collaboration.ts:30-37`)
- Reduces bundle size for non-collaborative users
- Single-user diagrams unaffected

**Error Handling:** (`src/collaboration.ts:72-76`)
- Failed room connection emits `app:error` event
- User sees error toast, can continue editing locally

**Design Decision:** Y.js CRDT chosen for true peer-awareness and conflict-free merging, avoiding lock-based concurrency issues common in traditional collaborative editors.

---

### FR-5: Diagram Sharing

**Status:** Implemented

Users share diagrams via compressed URLs and collaboration links.

**Code Reference:** `src/utils.ts:26-44`, `index.html:138-278`

**URL-Based Sharing:** LZ-String compression in hash fragment (`src/utils.ts:26-44`)
- Compression: `LZString.compressToEncodedURIComponent(code)`
- Decompression: `LZString.decompressFromEncodedURIComponent(hash)`
- Example: `https://mimaid.app#JDIEJHJvd0E...` (compressed diagram)
- Load diagram on page: `loadDiagramFromURL()` called during init

**Clipboard Copy:** Share button populates three link types (`index.html:229-272`)
1. **Diagram Link** (code in hash)
   - Button: "Copy Link"
   - Destination: Shows input field with full URL
   - Use case: Share snapshot of specific diagram

2. **Collaboration Link** (includes room)
   - Button: "Collaborate"
   - Generated: `{url}?room={roomId}&name={username}`
   - Use case: Real-time co-editing session

3. **Embed URL** (hides editor)
   - Button: "Embed URL"
   - Generated: `{url}?hideEditor`
   - Use case: View-only presentations, documentation

**View-Only Mode:** `?hideEditor` parameter hides editor pane
- Preview occupies full viewport
- Share controls remain available
- Useful for presentations and read-only links

**Persistence:** State stored across sessions
- URL hash: Diagram code (survives page reload)
- localStorage: Editor width, API key, provider settings

**Design Decision:** Stateless URL-based sharing avoids backend dependency, maximizing portability and allowing users to self-host.

---

### FR-6: Settings Management

**Status:** Implemented

Users configure AI provider, API keys, and model selection via popup dialog.

**Code Reference:** `index.html:71-123`, `src/config.ts:25-30`

**Provider Selection:** Card-based UI with three options (`index.html:81-100`)
- Google Gemini (default, `data-provider="google"`)
- OpenAI (`data-provider="openai"`)
- Anthropic Claude (`data-provider="anthropic"`)
- Each card displays branded icon

**API Key Input:** (`index.html:104-113`)
- Input type: `password` (masks characters)
- Placeholder: "Enter your {provider} API key"
- Hint: "Stored locally · never sent to our servers"
- Persistence: localStorage key `aiApiKey`

**Model Selection:** Dynamic dropdown (`index.html:115-119`)
- Default option: "Click to load models..."
- Populated from provider API on user click
- Persistence: localStorage key `aiModel`
- Falls back to `DEFAULT_MODELS` if not set (`src/config.ts:16-19`)

**Settings Persistence:** (`src/config.ts:25-30`)
```typescript
provider: (localStorage.getItem("aiProvider") as AIProviderType) || "google"
apiKey: localStorage.getItem("aiApiKey") || ""
model: localStorage.getItem("aiModel") || DEFAULT_MODELS.google
```

**Keyboard Dismiss:** Settings dialog closes on `Escape` key or click outside

**Security Note:** API keys stored client-side only (localStorage), not transmitted to Mimaid backend.

---

### FR-7: Error Handling & Validation

**Status:** Implemented

Comprehensive error reporting with line/column precision for Mermaid syntax errors.

**Code Reference:** `src/utils.ts:94-225`

**Error Parsing:** Seven regex patterns for Mermaid error formats (`src/utils.ts:105-119`)
1. "Parse error on line X:" → line only
2. "Parse error on line X:Y" → line and column
3. "Error at line X column Y" → line and column
4. "Line X:Y - Error message" → line and column
5. "Syntax error at line X" → line only
6. "Error on line X" → line only
7. "Line X" → line only (fallback)

**Heuristic Line Inference:** When regex fails, apply pattern matching (`src/utils.ts:155-179`)
- Diagram type errors → line 1
- Syntax errors → search for problematic syntax
- Common issues detected:
  - Unmatched brackets/parentheses (`src/utils.ts:188-193`)
  - Malformed arrows or connections (`src/utils.ts:195-199`)

**Syntax Issue Detection:** (`src/utils.ts:186-202`)
- Unmatched brackets: (count open vs close)
- Invalid arrows: look for --X or X-- without valid syntax
- Returns: true if issues found

**Error Message Cleanup:** (`src/utils.ts:209-225`)
- Remove redundant prefixes: "Error:", "Parse error:", "Syntax error:"
- Remove redundant line info: "at line X", "on line Y"
- Capitalize first letter
- Add period if missing

**Visual Error Indicators:** Three-layer display
1. Inline glyph margin marker (red dot on line number)
2. Squiggly underline on problematic line
3. Error overlay panel in preview pane

**Code Action:** "Fix with AI" quick-fix available on errors (`src/ai-handler.ts`)
- Triggered via Ctrl/Cmd+. on error line
- Sends error message + diagram code to AI
- Preset: "Fix & Optimize"

---

### FR-8: Claude Code Skill Export

**Status:** Implemented

Users export a Claude Code skill for programmatic diagram generation.

**Code Reference:** `src/skill-content.ts:1-2`, `index.html:176-220`

**Skill Modal:** Button in preview controls (`index.html:156-171`)
- Button text: "Get Claude Skill"
- Icon: Three horizontal lines (stack/module symbol)
- Modal displays after click

**Modal Features:** (`index.html:176-220`)
1. **Header:** Title + close button
2. **Description:** "Add this skill to Claude Code to generate shareable diagram URLs"
3. **Actions:**
   - Button: "Copy to Clipboard" (copies SKILL.md content)
   - Button: "Download SKILL.md" (triggers file download)
4. **Hint:** "Place in `~/.claude/skills/mimaid/SKILL.md`"

**Skill Content:** Loaded from markdown file (`src/skill-content.ts:1`)
```typescript
import SKILL_CONTENT from './skill-content.md?raw';
export { SKILL_CONTENT };
```

**Design Decision:** Vite's `?raw` import ensures markdown content loads as string, avoiding build complications.

---

### FR-9: Editor Layout & UI

**Status:** Implemented

Professional split-pane layout with collapsible editor and responsive controls.

**Code Reference:** `index.html:20-280`

**Split-Pane Layout:** (`index.html:20-135`)
- Left pane: Monaco Editor + status bar + settings + input
- Resize handle: Draggable divider with collapse button
- Right pane: Mermaid preview + floating controls

**Resizable Pane:**
- Min width: 20% (from config)
- Max width: 80%
- Drag handle with visual feedback
- Width persisted in localStorage (`src/utils.ts:50-60`)

**Collapse Button:** (`index.html:128-132`)
- Hidden icon (left-facing chevron)
- Toggles editor visibility
- Useful for full-screen preview

**Status Bar:** (`index.html:23-41`)
- Settings button (gear icon)
- Generation status text (centered)
- Input area with preset selector and input field

**Input Area:** (`index.html:42-69`)
- Preset button (grid icon) → shows 8 presets
- Text input (placeholder: "Enter your prompt here and press enter...")
- Disappears during AI generation (replaced by status)

**Floating Controls:** Preview pane buttons (`index.html:137-174`)
- Share (link icon)
- Claude Skill (stack icon)
- Zoom In (+)
- Zoom Out (-)

**Responsive Design:** ResizeObserver detects viewport changes, Monaco adjusts layout automatically (`MONACO_CONFIG.automaticLayout: true`)

---

## Feature Implementation Matrix

| Requirement | Code Location | UI | Persistence | Error Handling |
|-----------|---------------|-----|-------------|---|
| Code Editing | `configMermaidLanguage.ts:1-1040` | Monaco Editor | N/A | Syntax highlighting |
| Preview | `main.ts`, `utils.ts:94-147` | Canvas + overlay | URL hash | Error markers + overlay |
| AI Generation | `ai-handler.ts:1-244`, `config.ts:59-145` | Input + status | localStorage | Toast + error event |
| Collaboration | `collaboration.ts:1-87` | Presence indicators | Y.js sync | Console + error event |
| Sharing | `utils.ts:26-44` | Modal with 3 link types | URL hash | Copy feedback |
| Settings | `index.html:71-123` | Card UI + form | localStorage | Validation feedback |
| Error Display | `utils.ts:94-225` | Markers + overlay | N/A | 7 regex patterns + heuristics |
| Skill Export | `skill-content.ts:1-2` | Modal buttons | N/A | Download handler |

---

## Known Gaps & Limitations

### Critical Gaps (User Impact)
1. **No Undo/Redo for AI Changes:** AI generation overwrites editor content with no revert option. Users cannot easily compare before/after or try multiple AI outputs.

2. **No Export Formats:** Only URL sharing available. Users cannot download as PNG, SVG, or PDF.

3. **No Template Library:** Only AI-driven generation and presets. No curated starting templates for common patterns.

4. **No Offline Support:** AI features and collaboration require internet. No service worker or cached models.

5. **No User Accounts:** Everything anonymous, localStorage-only. No way to organize or archive diagrams across devices.

### Moderate Gaps (Developer Experience)
6. **No Rate Limiting:** Unprotected against API abuse. Users could spam AI requests exhausting quotas.

7. **Limited Collaboration Features:** No chat, no inline comments, no version history.

8. **No Analytics:** No data on feature adoption, diagram types, AI provider preferences.

### Design Gaps (Product Scope)
9. **Single-Provider Model Config:** Dropdown shows provider-specific models only. No cross-provider model comparison.

10. **Preset Auto-Population:** Input field fully replaced by preset text, not augmented. Users lose partial work.

---

## Unknowns Requiring Clarification

1. **Target User Persona:** Code analysis suggests technical audience (developers, engineers), but no confirmation of primary use case.

2. **Monetization Model:** No pricing, subscriptions, or premium features detected.

3. **Minimum Viable API:** No defined SLA for AI response time or diagram size limits.

4. **Compliance Requirements:** No security audit, GDPR, or data residency considerations found.

---

## Implementation Quality Assessment

**Code Organization:** Well-structured with clear separation of concerns
- Event-driven architecture via `EventHelpers`
- Handler classes (`AIHandler`, `CollaborationHandler`) encapsulate domain logic
- Configuration centralized in `config.ts`
- Type safety via `types.ts` interfaces

**Error Resilience:** Graceful degradation on service failures
- AI errors → toast notification, editor remains functional
- Collaboration errors → local editing continues
- Parse errors → inline markers, detailed messages

**Performance Optimizations:** Appropriate use of debouncing and lazy loading
- 250ms debounce on preview updates
- Monaco Editor lazy-loaded on demand
- Collaboration handler skipped if no `?room` parameter

**Security Considerations:** Client-side only, no backend dependencies
- API keys in localStorage (user responsibility)
- No server-side persistence
- Diagram URLs are publicly readable (by design)

---

## Document Metadata

**Document Type:** Product Requirements Specification
**Classification:** Public (product-facing)
**Last Verified:** 2026-03-11
**Code Snapshot:** Commit `56732c1` (UI redesign with settings popup)
**Verification Method:** Static code analysis
**Test Coverage:** Features verified by reading source code

**Oracle Attribution:** This document was compiled from codebase analysis with inline evidence paths (line numbers). Every requirement is traceable to implementation. No speculative features included.
