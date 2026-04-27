# Sub-Project 1: Refactor `main.ts` God Class

**Date:** 2026-04-27
**Parent:** `2026-04-27-mimaid-improvement-roadmap-design.md` § 4 Sub-Project 1
**Status:** Draft — pending user approval before plan/execution
**Type:** Pure structural refactor (zero behavioral change)

---

## 1. Goal

Decompose `src/main.ts` (1,559 lines, single god class `MermaidEditor`) into focused modules each <300 lines, with single responsibility and testable boundaries. **No user-visible behavior changes.** Same features, same UI, same persistence — just understandable in isolation.

## 2. Why now

- Roadmap spec verified the god class is the bottleneck for sub-projects 2/3/4
- Sub-Project 0 just landed test infra → refactor has safety net (12 passing tests)
- Sub-Project 5 just demonstrated finding latent bugs while reading source — splitting will surface more
- main.ts has grown from feature work; every recent commit (share modal, settings redesign, AI providers) added 50-200 LOC each. The trajectory is unsustainable.

## 3. Module Decomposition (revised after deep read)

The roadmap's initial 12-module split missed several responsibilities I found during deep-read of lines 540-1559. Revised split: **15 new files**.

### 3.1 Entry & orchestration

| Module | Source lines | Target LOC | Responsibility |
|---|---|---|---|
| `src/main.ts` (kept) | new | ~30 | Entry point only — `new MimaidApp()` |
| `src/app/MimaidApp.ts` | 73-101, 264-313, 665-670 | ~120 | Top-level orchestrator; constructs and wires modules; subscribes to cross-cutting events |

### 3.2 Editor layer

| Module | Source lines | Target LOC | Responsibility |
|---|---|---|---|
| `src/editor/MonacoLoader.ts` | 29-46, 172-207 | ~80 | Lazy-load Monaco; configure Mermaid language; instantiate editor |
| `src/editor/EditorPaneController.ts` | 125-170, 511-542 | ~150 | Visibility (hide/show), resize handle, collapse toggle, persistence |
| `src/editor/EditorContentSync.ts` | 243-262 | ~50 | Debounced editor change → emit `editor:change` + URL hash update |

### 3.3 Render layer

| Module | Source lines | Target LOC | Responsibility |
|---|---|---|---|
| `src/render/MermaidRenderer.ts` | 231-238, 547-631 | ~180 | Mermaid render, panZoom setup, preview DOM updates |
| `src/render/ErrorOverlay.ts` | 672-705 (showError/hideError + currentError state) | ~80 | Error overlay element; subscribes to `diagram:error` |
| `src/render/ErrorMarkers.ts` | 709-850 | ~180 | Monaco markers/decorations for parsed errors (parseMermaidError already in utils) |
| `src/render/AICodeActionProvider.ts` | 852-940 | ~100 | Monaco code action + command + keybinding for "Fix with AI" |

### 3.4 AI layer

| Module | Source lines | Target LOC | Responsibility |
|---|---|---|---|
| `src/ai/ProviderModels.ts` | 953-1007 | ~70 | Fetch model lists per provider (Google, OpenAI, Anthropic) — pure async functions |
| `src/ai/AIFixHandler.ts` | 1009-1120 | ~140 | "Fix with AI" UX flow: build fix prompt, swap input area, trigger AIHandler |

(Note: existing `src/ai-handler.ts` and `src/ai-messages.ts` stay as-is. New AI files go under `src/ai/` namespace; consider moving the existing two there as a follow-up cleanup but NOT in this sub-project.)

### 3.5 UI layer

| Module | Source lines | Target LOC | Responsibility |
|---|---|---|---|
| `src/ui/Modal.ts` | 52-71 | ~40 | Shared modal dismiss-on-outside-click + Escape pattern |
| `src/ui/Toast.ts` | 677-687 | ~50 | Toast notification element + fade timer |
| `src/ui/SettingsPanel.ts` | 330-509 | ~280 | Provider cards, API key input, model select with fetch, save logic |
| `src/ui/InputAreaController.ts` | 1122-1308 | ~220 | Manage input area visibility based on API-key/error state; create/show/hide field, preset button, warnings |
| `src/ui/PresetGrid.ts` | 1310-1393 | ~120 | Populate preset items based on editor content; click handler emits `ui:preset:select` |
| `src/ui/InputBar.ts` | 315-328, 1097-1105, 1242-1251 | ~70 | Input field keydown → emit `ui:input:submit` |
| `src/ui/ShareModal.ts` | 1497-1559 | ~120 | Share modal: link/collab/embed copy buttons |
| `src/ui/SkillModal.ts` | 1395-1495 | ~120 | Claude skill modal: copy/download SKILL.md |
| `src/ui/ZoomControls.ts` | 268-275, 942-948 | ~40 | Zoom in/out buttons → drive panZoom |
| `src/ui/icons.ts` (new constants) | scattered SVG strings | ~150 | Centralize SVG icon strings used in createElement+innerHTML calls |

### 3.6 Final shape

- **Before:** `src/main.ts` 1,559 lines + 7 other files
- **After:** `src/main.ts` ~30 lines + 22 source files (7 existing + 15 new), no file >300 LOC except `configMermaidLanguage.ts` (data-heavy, leave alone)

## 4. Communication Pattern

All new modules communicate **only via the event bus** (`src/events.ts`). No direct cross-module method calls. New event types added:

```typescript
// Additions to AppEvents in src/events.ts
"ui:share:open": {};
"ui:share:close": {};
"ui:skill:open": {};
"ui:skill:close": {};
"ui:toast:show": { message: string; type: "success" | "error" };
"render:complete": { svg: string };
"ai:fix:request": { code: string; error: string };
"editor:visibility:toggle": {};
"editor:layout:request": {};
```

## 5. Constraints (MUST preserve)

- All localStorage keys (`aiProvider`, `aiApiKey`, `aiModel`, `editorWidth`)
- All URL params (`?room`, `?name`, `?hideEditor`)
- LZString hash format
- All existing keyboard shortcuts (Ctrl/Cmd+., Ctrl/Cmd+Shift+F)
- All event names in current `AppEvents` (only ADD, never RENAME or REMOVE)
- All 12 Sub-Project 0 tests continue passing
- Build output bundle size within ±5% of current

## 6. Approach: Strangler-Pattern, Bottom-Up

Refactor in 5 stages, **each stage independently mergeable**. After each stage: tests pass, build green, app manually smoke-tested.

### Stage A: Pure utilities (lowest risk)
1. Extract `src/ui/Toast.ts` — pure function, no state
2. Extract `src/ui/Modal.ts` — pure function (already module-level in main.ts:52-71)
3. Extract `src/ui/icons.ts` — string constants only
4. Extract `src/ai/ProviderModels.ts` — pure async fetch functions

### Stage B: Editor + Render core
5. Extract `src/editor/MonacoLoader.ts`
6. Extract `src/editor/EditorContentSync.ts`
7. Extract `src/render/MermaidRenderer.ts`
8. Extract `src/render/ErrorOverlay.ts`

### Stage C: Editor pane controls
9. Extract `src/editor/EditorPaneController.ts`
10. Extract `src/ui/ZoomControls.ts`

### Stage D: Error markers + AI fix
11. Extract `src/render/ErrorMarkers.ts`
12. Extract `src/render/AICodeActionProvider.ts`
13. Extract `src/ai/AIFixHandler.ts`

### Stage E: UI panels (most state)
14. Extract `src/ui/SettingsPanel.ts`
15. Extract `src/ui/SkillModal.ts`
16. Extract `src/ui/ShareModal.ts`
17. Extract `src/ui/PresetGrid.ts`
18. Extract `src/ui/InputAreaController.ts` + `src/ui/InputBar.ts`
19. Final `src/main.ts` cleanup → `src/app/MimaidApp.ts` thin orchestrator

## 7. Out of Scope

- Behavioral changes (no new features, no bug fixes beyond accidentally-discovered)
- CSS reorganization (`style.css` is its own concern)
- Switching frameworks (Vue/React) — would invalidate Monaco integration
- Test coverage expansion beyond what's already there (defer to per-module additions in later sub-projects)
- Renaming events
- Moving existing `src/ai-handler.ts` and `src/ai-messages.ts` under `src/ai/` (defer — would require git rename + test path updates; do as separate cleanup)

## 8. Success Criteria

- `src/main.ts` ≤ 50 lines
- No new file > 300 lines (except documented exceptions)
- All Sub-Project 0 tests pass (12/12)
- `bun run typecheck` clean
- `bun run build` succeeds with bundle size delta ≤ 5%
- Manual smoke test passes:
  - [ ] Load app — diagram renders
  - [ ] Edit diagram — preview updates
  - [ ] AI generate (with API key) — works
  - [ ] AI fix on error — works
  - [ ] Settings: change provider, save, AI uses new provider
  - [ ] Share modal: link/collab/embed buttons all copy correctly
  - [ ] Skill modal: copy + download work
  - [ ] Resize editor pane — works, persists
  - [ ] Collapse editor pane — works
  - [ ] Zoom in/out buttons — works
  - [ ] Preset selection (creation + modification mode) — works
  - [ ] Collaboration (`?room=test`) — joins room, cursors visible

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Subtle DOM ordering changes break visual | After each stage, manual smoke test; commit per stage so revert is easy |
| Event bus circular deps surface | Events are 1-way; controllers only emit OR listen, never both for same event |
| Monaco editor instance shared across modules | Pass via constructor injection; only `MonacoLoader` creates it; others receive |
| LocalStorage key drift | Hardcoded constants stay in `src/config.ts`; new modules import from there, never re-string |
| Tests start failing | Stop, fix that module before continuing — never accumulate broken tests across stages |

## 10. Estimated Effort

- Stage A: 1-2 hours (4 simple extracts)
- Stage B: 2-3 hours (4 modules, more state)
- Stage C: 1 hour (2 modules)
- Stage D: 2-3 hours (3 modules with Monaco coupling)
- Stage E: 3-4 hours (5+ modules with most state)
- **Total: 9-13 hours** across 19 commits

Plan should be ~19 tasks, one task per extract, each ending in a commit + test verification.

## 11. Next Step

After user approval of this spec, write detailed implementation plan as `docs/superpowers/plans/2026-04-27-mimaid-subproject-1-refactor.md` with bite-sized tasks per the writing-plans skill conventions.
