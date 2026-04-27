# Mimaid Improvement Roadmap

**Date:** 2026-04-27
**Author:** Brainstorming session
**Status:** Draft — pending user approval
**Type:** Multi-phase roadmap (6 sub-projects, sequenced)

---

## 1. Executive Summary

Mimaid is a 4,940-line browser-based Mermaid editor. Recent commits show momentum on UI polish (Soft Organic redesign, share modal, multi-provider AI), but the codebase has accumulated structural debt that now blocks further iteration: `src/main.ts` is **1,559 lines in a single god class** owning DOM init, Monaco lifecycle, Mermaid rendering, error parsing, settings, presets, share/skill modals, resize, zoom, and AI handler wiring. There are zero tests.

This roadmap decomposes "improve the app" into **6 sub-projects** (numbered 0-5) sequenced so that structural foundations land before feature work, preventing the next round of features from making the god class worse.

**Total estimated effort:** ~4-6 implementation sessions (one per sub-project), each independently shippable.

---

## 2. Current State Assessment

### 2.1 Structural debt (HIGH confidence — verified by direct reading)

| Concern | Evidence | Impact |
|---|---|---|
| God class | `src/main.ts:73-1559` — single `MermaidEditor` class with 30+ private methods spanning DOM init, Monaco, Mermaid, settings, presets, modals, share, skill export, resize, zoom, error decorations | Every feature touches this file → merge conflicts, hard to test, hard to reason about |
| No tests | `package.json` has no `vitest`/`jest`/test scripts | Refactor is high-risk; regressions silent until manual QA |
| Dead/debug code | `src/utils.ts:96,126,137,145` — `console.log('[DEBUG] ...')` left in production `parseMermaidError` | Console noise in prod; small but symptomatic |
| Settings logic inline | `src/main.ts:330-509` — 180-line `setupSettingsListeners` with provider switching, model fetching, save logic all interleaved | Cannot reuse settings UI elsewhere; hard to add new providers |
| Modal handling duplicated | `setupSkillModalListeners`, `setupShareModalListeners` + `setupModalDismiss` | Modal pattern is repeated 3+ times with subtle variations |

### 2.2 Feature gaps (MEDIUM confidence — inferred from README + code)

| Gap | Evidence | User impact |
|---|---|---|
| Export PNG/SVG removed | Commit `2b8ad46 refactor(ui): remove diagram export controls`, but `README.md:11,76-77` still advertises export | User reads docs, expects export, finds nothing |
| No diagram history | Editor has Monaco undo only — AI re-generation overwrites without checkpoint | Lose work after AI generation |
| AI single-turn only | `src/ai-handler.ts:121-140` builds messages from current code only — no conversation memory | Cannot iteratively refine ("now add error handling to that") |
| No abort/retry | `streamText` started but no `AbortController` wired | Stuck UI on slow/hung generation |
| No vision input | All 3 providers support image input, none used | Cannot "make a diagram from this whiteboard photo" |
| Hardcoded system prompt | `src/ai-handler.ts:142-174` | Cannot customize style per-user |
| Manual room sharing only | `src/collaboration.ts:30-38` reads `?room=` from URL only | High-friction collab onboarding |

### 2.3 Strengths to preserve

- Type-safe event bus (`src/events.ts`) — keep, extend
- Lazy loading pattern for Monaco + Collaboration — keep
- Streaming AI with marker parsing (`src/ai-handler.ts:192-227`) — clean state machine
- LZ-String URL hash sharing — works well
- Multi-provider abstraction via Vercel AI SDK — recent good investment

---

## 3. Decomposition: 6 Sub-Projects

| # | Sub-project | Effort | Depends on |
|---|---|---|---|
| **0** | Test infrastructure | S | — |
| **1** | Refactor god class | M | 0 |
| **2** | Diagram features (export, library) | S | 1 |
| **3** | AI/UX upgrade | L | 1 |
| **4** | Collaboration polish | M | 1 |
| **5** | Quality cleanup (debug logs, README sync) | XS | — (can parallel with any) |

**Effort legend:** XS = <1h, S = 2-4h, M = 1 day, L = 2-3 days

### Sequencing rationale

- **0 (tests) before 1 (refactor):** Refactor without tests = regression roulette. Even 5-10 smoke tests covering "load → edit → render → no error" let us refactor with confidence.
- **1 (refactor) before 2/3/4:** Adding features to a 1,559-line god class makes it 1,800+. Refactor first means each subsequent feature lands in its own focused module.
- **2 before 3:** Smaller scope, restores advertised functionality, builds momentum.
- **5 (cleanup) anytime:** Independent — can ship as quick PR alongside any other.

### Out of scope for this roadmap

- Backend/server (mimaid is intentionally serverless)
- Authentication system (not needed)
- Mobile-native apps (browser-only)
- Plugin/extension architecture (no demand signal)
- i18n (single-locale acceptable)

---

## 4. Sub-Project Specs

### Sub-Project 0: Test Infrastructure

**Goal:** Establish minimal Vitest setup with smoke tests sufficient to make refactor (sub-project 1) safe.

**Scope:**
- Add `vitest` + `jsdom` to devDependencies
- `vitest.config.ts` with jsdom environment
- `npm run test` script
- 5-8 smoke tests covering critical paths:
  1. URL hash compression/decompression roundtrip (`utils.ts`)
  2. `parseMermaidError` extracts line numbers correctly for known patterns
  3. Event bus emit/listen happy path
  4. AI handler `buildMessages` produces correct structure with/without current code
  5. Stream parser correctly extracts code from \`\`\`mermaid blocks
  6. Mermaid render integration test (mock mermaid module)

**Out of scope:**
- Full E2E tests (Playwright) — defer until app stabilizes
- Visual regression tests
- Coverage targets — focus on smoke, not metrics

**Success criteria:**
- `bun run test` exits 0
- All 5-8 tests pass
- Tests run in <5s
- README documents `bun run test`

**Approach:** Vitest is the standard pairing with Vite — zero config friction. Use jsdom (not happy-dom) for Monaco/DOM interop. Mock `mermaid` and `monaco-editor` to avoid loading them in test env.

**Risks:**
- LOW — test infra is well-trodden ground
- Monaco mocking may need iteration; acceptable since we don't test Monaco-internal behavior

---

### Sub-Project 1: Refactor `main.ts` God Class

**Goal:** Decompose 1,559-line `MermaidEditor` into focused modules each <300 lines, with clear single responsibilities and testable boundaries. Net file count grows but each file becomes understandable in isolation.

**Scope — proposed module split:**

| New module | Responsibility | Source lines (current `main.ts`) | Target LOC |
|---|---|---|---|
| `src/app/MimaidApp.ts` | Top-level orchestrator (kept thin) | 73-101, 281-313 | ~150 |
| `src/editor/MonacoLoader.ts` | Lazy load + configure Monaco | 29-46, 172-207 | ~80 |
| `src/editor/EditorPaneController.ts` | Editor visibility, resize, collapse | 125-170, 511-542 | ~150 |
| `src/render/MermaidRenderer.ts` | Mermaid render, pan/zoom, error overlay | 231-238, 547-952 (render + zoom + error overlay logic) | ~250 |
| `src/render/ErrorMarkers.ts` | Monaco error decorations + code action provider | error decoration methods, 1155-1284 | ~180 |
| `src/ui/SettingsPanel.ts` | Settings dialog: provider cards, model fetch, save | 330-509, 953-1009 | ~280 |
| `src/ui/ShareModal.ts` | Share modal: link/collab/embed buttons | 1497-1559 | ~120 |
| `src/ui/SkillModal.ts` | Claude skill export modal | 1419-1496 | ~100 |
| `src/ui/PresetGrid.ts` | Preset buttons, switch creation/modification | 1376-1418 | ~120 |
| `src/ui/InputBar.ts` | Prompt input field + keyboard shortcuts | 315-328, 1097-1146 | ~100 |
| `src/ui/Toast.ts` | Toast notifications | (extracted from current) | ~60 |
| `src/ui/Modal.ts` | Shared modal dismiss/escape pattern | 52-71 | ~40 |

**Communication:** All modules communicate via existing `eventBus` (`src/events.ts`). No direct cross-module method calls. New events added as needed (`AppEvents` interface extended).

**Out of scope:**
- Behavioral changes — pure structural refactor, every existing feature continues working identically
- CSS reorganization (`style.css` is 1,274 lines — separate concern, defer to future)
- Switching to a framework (Vue/React/Svelte) — no benefit for this app size, would invalidate Monaco integration

**Success criteria:**
- `src/main.ts` shrinks to <100 lines (entry point only)
- No file in `src/` exceeds 300 lines (except `configMermaidLanguage.ts` which is data-heavy)
- All sub-project 0 smoke tests still pass
- Manual smoke: load app → render diagram → AI generate → settings save → share modal → all work
- TypeScript compiles with no new errors

**Approach considered & rejected:**
- **State management library (Zustand, Redux):** Overkill — event bus already adequate, app state is small
- **Web Components:** Adds bundle weight, no clear win over plain TS classes
- **Full rewrite to Vue/React:** Nuclear option, throws away working code, invalidates this codebase's strengths

**Approach chosen:** Plain TS classes + event bus. Each module owns its DOM elements, listens for relevant events, emits state changes. Constructor receives only what it needs (no god-DI).

**Risks:**
- MEDIUM — refactor of this size always has surprises. Mitigation: smoke tests from sub-project 0, commit per module, manual smoke after each module.
- LOW — event bus handles cross-module coupling cleanly

---

### Sub-Project 2: Diagram Features

**Goal:** Restore advertised export functionality and add diagram library for saved templates.

**Scope:**

**2a. Export PNG/SVG (restore):**
- Add export button group to floating-controls in preview pane
- SVG export: serialize current rendered SVG, trigger download
- PNG export: render SVG to canvas, export as PNG
- Both honor current pan/zoom view (export what user sees)

**2b. Copy as image:**
- "Copy" button alongside export — copies PNG to clipboard via Clipboard API

**2c. Diagram library (local-only):**
- "My Diagrams" panel accessible from header
- Save current diagram with auto-generated name (timestamp + first-line as title) + manual rename
- List, load, delete saved diagrams from localStorage
- Storage limit warning at >5MB (localStorage typical limit)

**Out of scope:**
- Cloud sync (no backend)
- Diagram versioning/history within a saved diagram (defer to sub-project 3)
- Folders/tags (YAGNI — add when 50+ diagrams)
- Export to PDF (rare use case, large library cost)

**Success criteria:**
- Export PNG produces a valid image matching the on-screen render
- Export SVG opens correctly in browser/Inkscape
- Copy-as-image pastes successfully into Slack/Notion/email
- Library: save → reload page → list shows diagram → load restores it exactly
- README updated to reflect actual capabilities

**Approach:**
- Reuse `svg-pan-zoom` viewport state for PNG canvas dimensions
- localStorage with simple JSON schema: `{ id, name, code, createdAt, updatedAt }[]`
- No library framework — simple module owning the panel UI

**Risks:**
- LOW — these are well-understood browser APIs

---

### Sub-Project 3: AI/UX Upgrade

**Goal:** Make AI interaction feel like a real assistant — multi-turn refinement, undo across generations, image input, abort/retry.

**Scope:**

**3a. Conversation memory:**
- Maintain per-session conversation history (current code + last N user/assistant turns)
- Pass history to `streamText` so "now add X" works
- Clear-conversation button
- Persist history in localStorage per browser session (not across sessions — privacy default)

**3b. Generation history (cross-AI undo):**
- Snapshot diagram state before every AI generation
- "↩ Undo AI generation" button restores pre-generation snapshot
- Last 10 generations kept in memory

**3c. Abort + retry:**
- AbortController wired into `streamText`
- Stop button visible during generation
- "Retry" button on error toast

**3d. Vision input (image → diagram):**
- Drag-and-drop image onto input field, or paste image from clipboard
- Image attached as multimodal content to AI request (Google/OpenAI/Anthropic all support)
- Useful prompts: "make a diagram from this whiteboard photo", "convert this UML screenshot to mermaid"

**3e. Custom system prompt (advanced):**
- Settings has optional "Custom instructions" textarea
- Appended to default Mermaid v11 system prompt
- Use case: enforce team naming conventions, color schemes

**Out of scope:**
- AI model fine-tuning
- Streaming preview during typing (latency/cost concern)
- AI-suggested next-edit completions in Monaco (separate large project)
- Voice input (no clear demand)

**Success criteria:**
- Multi-turn: "make a flowchart" → "add error handling to step 3" → result shows error handling added (not full regen)
- Undo: AI generates → undo button → previous diagram restored
- Abort: long generation → click stop → request cancelled, UI returns to ready state
- Vision: drop a hand-drawn diagram photo → AI produces matching mermaid
- Custom prompt: set "always use kebab-case node IDs" → next generation respects it

**Approach:**
- Conversation: simple array in `AIHandler`, capped at last 10 turns
- Snapshots: in-memory ring buffer, no persistence
- Vision: use Vercel AI SDK's `experimental_attachments` or `parts` API (verify current version)
- Custom prompt: append to existing system prompt with separator

**Risks:**
- MEDIUM — vision API surface differs across providers; need testing matrix
- LOW — abort/undo/conversation are well-understood patterns

---

### Sub-Project 4: Collaboration Polish

**Goal:** Reduce friction to start collaborating; make presence visible.

**Scope:**

**4a. Visible presence:**
- Show live cursors of other users (Liveblocks awareness already provides cursor data, just not rendered)
- Show user list with name + color in header
- Show "X is typing..." indicator

**4b. Easy room creation:**
- "Start collaboration" button in header — generates random room ID, copies invite URL, joins automatically
- No need to manually craft `?room=foo&name=bar`

**4c. Room status indicator:**
- Header shows "Solo" or "Collab: <room-name> · 3 users"
- Click to copy invite link or leave room

**Out of scope:**
- Comments on diagram nodes (heavy feature, separate project)
- Voice/video chat (use Discord/Zoom)
- Permissions/roles (mimaid has no auth)
- Cursor chat / reactions (nice-to-have, defer)

**Success criteria:**
- User A clicks "Start collaboration" → URL copied → User B opens it → both see each other's cursors and names
- Leaving room transitions UI back to solo mode without reload
- 2 users editing same diagram see no conflicts (Y.js already handles this)

**Approach:**
- Liveblocks awareness API already gives us `(name, color, cursor)` — render in CSS-positioned overlay
- Random room ID: 6-char nanoid-style
- Header status: small component subscribing to `collab:*` events

**Risks:**
- LOW — Liveblocks docs cover all of this; mostly UI work

---

### Sub-Project 5: Quality Cleanup

**Goal:** Remove dead code, fix README/code drift, fix small annoyances.

**Scope:**
- Remove `console.log('[DEBUG] ...)` from `src/utils.ts:96,126,137,145`
- Update `README.md:11,76-77` to remove export claims (until sub-project 2 lands) OR mark "coming back in v2"
- Add `bun run test`, `bun run typecheck` scripts to package.json (typecheck is currently bundled into `build`)
- Remove unused `skill-content.ts` if confirmed unused (2 lines — likely re-export)
- Audit `src/style.css` (1,274 lines) for dead selectors — quick win

**Out of scope:**
- CSS reorganization (separate concern)
- Refactoring config object shapes (would break localStorage compatibility)

**Success criteria:**
- `grep -r "DEBUG" src/` returns empty
- README accurately describes current features
- `bun run typecheck` exists and passes
- No regression in app behavior

**Approach:** Mechanical cleanup, no design decisions needed. Can ship as a single small PR.

**Risks:** None

---

## 5. Cross-Cutting Concerns

### 5.1 Backwards compatibility
- localStorage keys (`aiProvider`, `aiApiKey`, `aiModel`, `editorWidth`) MUST be preserved across refactor
- URL hash format (LZString-compressed) MUST be preserved — old shared links must still work
- Query params (`?room`, `?name`, `?hideEditor`) MUST keep working

### 5.2 Bundle size
- Monitor bundle after each sub-project (`bun run build` — Vite reports sizes)
- Refactor (sub-project 1) should be ~neutral
- Vision input may add Vercel AI SDK image utilities — acceptable

### 5.3 Performance budgets
- Initial render: maintain current "fast load" feel (no measurable regression in TTI)
- Live preview debounce stays at 250ms

### 5.4 Documentation
- Each sub-project updates `CLAUDE.md` if architecture changes
- `docs/architecture.md` (already exists) refreshed after sub-project 1

---

## 6. Sub-Project Dependency Graph

```
   ┌─────────────────────┐
   │ 0. Test infra       │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐         ┌──────────────────────┐
   │ 1. Refactor god class│ ←─────  │ 5. Quality cleanup    │ (parallel)
   └──────────┬──────────┘         └──────────────────────┘
              │
        ┌─────┼─────────┬───────────────┐
        ▼     ▼         ▼               ▼
   ┌────────┐ ┌────────┐ ┌──────────────────┐
   │ 2. Export│ │ 3. AI │ │ 4. Collab polish │
   └────────┘ └────────┘ └──────────────────┘
```

---

## 7. Next Steps

1. **User reviews this roadmap doc** — approve scope, sequence, and decomposition (or request changes)
2. After approval, **brainstorm sub-project 0 (test infra)** as its own focused spec → plan → implement cycle
3. Repeat for sub-projects 1 → 2 → 3 → 4 → 5

Each sub-project will produce its own `docs/superpowers/specs/YYYY-MM-DD-mimaid-subproject-N-<name>-design.md` and corresponding implementation plan before any code is written for that sub-project.

---

## Appendix A: Confidence labels per claim

- **HIGH:** main.ts is 1,559 lines (verified `wc -l`)
- **HIGH:** No tests in package.json (verified read)
- **HIGH:** Console.log debug in utils.ts (verified file:line)
- **HIGH:** Export removed in commit 2b8ad46 (verified `git log`)
- **HIGH:** README still claims export (verified read)
- **MEDIUM:** Effort estimates (S/M/L) — based on similar refactors but not measured for this codebase
- **MEDIUM:** "AI single-turn only" — based on `buildMessages` reading; possible there's hidden state I missed
- **LOW:** "Most users use solo mode" — assumption, no analytics data
