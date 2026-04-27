# Mimaid Sub-Project 0: Test Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Vitest + jsdom test infrastructure with 7 smoke tests covering pure-logic surfaces (URL hash compression, Mermaid error parsing, event bus, AI message building) so that Sub-Project 1 (god-class refactor) can land safely.

**Architecture:** Vitest with jsdom environment, colocated `*.test.ts` files next to source, no test directory restructure. Single small refactor extracts `buildMessages` from `ai-handler.ts` into a standalone pure function `src/ai-messages.ts` so it becomes testable without instantiating the class. Stream parser and full Mermaid render integration are explicitly deferred to Sub-Project 1 because they require god-class decomposition first.

**Tech Stack:** Vitest 2.x, jsdom, TypeScript 5.6, Vite 5, bun (package manager and test runner via `bunx`).

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `package.json` | Modify | Add devDeps (vitest, jsdom, @types/jsdom), add `test`/`test:run`/`typecheck` scripts |
| `vitest.config.ts` | Create | Vitest config: jsdom env, globals enabled, includes `src/**/*.test.ts` |
| `src/sanity.test.ts` | Create (then delete in Task 7) | One-line test to verify infra works |
| `src/utils.test.ts` | Create | Tests for `loadDiagramFromURL` ↔ `generateDiagramHash` roundtrip and `parseMermaidError` |
| `src/events.test.ts` | Create | Tests for `EventHelpers.safeEmit` / `safeListen` / `once` |
| `src/ai-messages.ts` | Create | Pure function `buildAIMessages(prompt, currentCode)` extracted from `ai-handler.ts` |
| `src/ai-handler.ts` | Modify | Replace inline `buildMessages` private method with import from `./ai-messages` |
| `src/ai-messages.test.ts` | Create | Tests for `buildAIMessages` with empty + non-empty `currentCode` |
| `README.md` | Modify | Add testing section |

---

## Out of Scope (deferred to Sub-Project 1)

- Stream parser (`handleStream` in `ai-handler.ts:192-227`) — requires extracting AsyncIterable consumption logic from class state; cleanest after refactor splits AIHandler responsibilities.
- Mermaid render integration test — `renderMermaidDiagram` lives inside the 1559-line `MermaidEditor` god class with tightly coupled DOM, panZoom, and error overlay state. Testing it now requires either heavy mocking or partial extraction; both fight the refactor coming next. Better to test after Sub-Project 1's `MermaidRenderer.ts` exists.
- Component tests, visual regression, E2E (Playwright). All explicit non-goals per spec.

---

### Task 1: Install Vitest infrastructure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/sanity.test.ts`

- [ ] **Step 1: Install dev dependencies**

Run:
```bash
bun add -d vitest@^2.1.0 jsdom@^25.0.0 @types/jsdom@^21.1.0
```

Expected: `package.json` `devDependencies` now contains `vitest`, `jsdom`, `@types/jsdom`. `bun.lock` updated.

- [ ] **Step 2: Add test scripts to `package.json`**

Modify `package.json` `scripts` section to add `test`, `test:run`, `typecheck`. Final scripts block:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:run": "vitest run",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

Create `vitest.config.ts` at project root with content:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Write a sanity test**

Create `src/sanity.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("vitest is wired up", () => {
    expect(1 + 1).toBe(2);
  });

  it("jsdom provides window", () => {
    expect(typeof window).toBe("object");
    expect(typeof window.localStorage).toBe("object");
  });
});
```

- [ ] **Step 5: Run sanity test**

Run:
```bash
bun run test:run
```

Expected output includes:
```
 ✓ src/sanity.test.ts (2)
   ✓ sanity (2)
     ✓ vitest is wired up
     ✓ jsdom provides window

 Test Files  1 passed (1)
      Tests  2 passed (2)
```

If failing: most likely `vitest` couldn't find jsdom — verify `bun add -d` succeeded and `vitest.config.ts` exists at project root.

- [ ] **Step 6: Commit**

```bash
git add package.json bun.lock vitest.config.ts src/sanity.test.ts
git commit -m "test: add vitest + jsdom infrastructure with sanity test"
```

---

### Task 2: Test URL hash compression roundtrip

**Files:**
- Create: `src/utils.test.ts`

- [ ] **Step 1: Write the test**

Create `src/utils.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { loadDiagramFromURL, generateDiagramHash } from "./utils";

describe("URL hash compression", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("roundtrips diagram code through hash compression", () => {
    const original = "flowchart TD\n  A[Start] --> B[End]";
    generateDiagramHash(original);
    const decoded = loadDiagramFromURL();
    expect(decoded).toBe(original);
  });

  it("returns null when no hash is present", () => {
    expect(loadDiagramFromURL()).toBeNull();
  });

  it("clears hash when given empty string", () => {
    generateDiagramHash("flowchart TD\n  A --> B");
    expect(window.location.hash).not.toBe("");
    generateDiagramHash("");
    expect(window.location.hash).toBe("");
  });
});
```

- [ ] **Step 2: Run test**

Run:
```bash
bun run test:run src/utils.test.ts
```

Expected: 3 passed. If `loadDiagramFromURL()` returns null in the roundtrip test, check that `generateDiagramHash` actually wrote to `window.location.hash` — jsdom should support this out of the box.

- [ ] **Step 3: Commit**

```bash
git add src/utils.test.ts
git commit -m "test(utils): add URL hash compression roundtrip tests"
```

---

### Task 3: Test `parseMermaidError`

**Files:**
- Modify: `src/utils.test.ts` (append to existing file)

- [ ] **Step 1: Append parseMermaidError tests**

Append to `src/utils.test.ts`:

```ts
import { parseMermaidError } from "./utils";

describe("parseMermaidError", () => {
  it("extracts line number from 'Parse error on line N' format", () => {
    const result = parseMermaidError(
      "Parse error on line 5: unexpected token",
      "flowchart TD\nA --> B\nC --> D\nE\nF -- G",
    );
    expect(result.line).toBe(5);
    expect(result.severity).toBe("error");
    expect(result.source).toBe("mermaid");
  });

  it("extracts both line and column from 'line N:M' format", () => {
    const result = parseMermaidError(
      "Syntax error at line 3:7 — unexpected character",
      "flowchart TD\n A --> B\n C --> D",
    );
    expect(result.line).toBe(3);
    expect(result.column).toBe(7);
  });

  it("returns parsed error even when no line info is in the message", () => {
    const result = parseMermaidError("Diagram type not recognized", "flowchart TD\nA --> B");
    expect(result.severity).toBe("error");
    expect(result.message).toMatch(/diagram/i);
    // inferErrorLine kicks in for "diagram" keyword and returns line 1
    expect(result.line).toBe(1);
  });

  it("cleans error message by removing redundant prefixes and trailing line refs", () => {
    const result = parseMermaidError(
      "Parse error: unexpected end of input on line 2",
      "flowchart TD\nA -->",
    );
    // Prefix "Parse error:" stripped, trailing "on line 2" stripped, capitalized, period added
    expect(result.message).toBe("Unexpected end of input.");
  });
});
```

- [ ] **Step 2: Run all utils tests**

Run:
```bash
bun run test:run src/utils.test.ts
```

Expected: 7 passed (3 from Task 2 + 4 here). If a test fails, the most likely cause is that the regex patterns in `utils.ts:105-120` don't match exactly the string we passed — read the actual `parseMermaidError` source and adjust the test input to match a documented pattern, but DO NOT change the implementation in this task (we're testing existing behavior, not rewriting it).

- [ ] **Step 3: Commit**

```bash
git add src/utils.test.ts
git commit -m "test(utils): add parseMermaidError pattern coverage"
```

---

### Task 4: Test `EventHelpers` event bus

**Files:**
- Create: `src/events.test.ts`

- [ ] **Step 1: Write the test**

Create `src/events.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { eventBus, EventHelpers } from "./events";

describe("EventHelpers", () => {
  beforeEach(() => {
    eventBus.all.clear();
  });

  it("safeListen receives payloads emitted by safeEmit", () => {
    const handler = vi.fn();
    EventHelpers.safeListen("ai:start", handler);
    EventHelpers.safeEmit("ai:start", { prompt: "hello" });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ prompt: "hello" });
  });

  it("safeListen returns an unsubscribe function that stops further calls", () => {
    const handler = vi.fn();
    const unsubscribe = EventHelpers.safeListen("ai:start", handler);
    EventHelpers.safeEmit("ai:start", { prompt: "first" });
    unsubscribe();
    EventHelpers.safeEmit("ai:start", { prompt: "second" });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ prompt: "first" });
  });

  it("once fires the handler exactly one time across multiple emits", () => {
    const handler = vi.fn();
    EventHelpers.once("ai:start", handler);
    EventHelpers.safeEmit("ai:start", { prompt: "a" });
    EventHelpers.safeEmit("ai:start", { prompt: "b" });
    EventHelpers.safeEmit("ai:start", { prompt: "c" });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ prompt: "a" });
  });
});
```

- [ ] **Step 2: Run test**

Run:
```bash
bun run test:run src/events.test.ts
```

Expected: 3 passed. If `eventBus.all.clear()` errors, mitt's API uses `eventBus.all` as a Map — this is correct for mitt v3, which is what `package.json` declares. If the test still fails, fall back to creating a fresh test handler inside each `it` rather than relying on `beforeEach` cleanup.

- [ ] **Step 3: Commit**

```bash
git add src/events.test.ts
git commit -m "test(events): add EventHelpers safeEmit/safeListen/once coverage"
```

---

### Task 5: Extract `buildMessages` to `src/ai-messages.ts`

**Files:**
- Create: `src/ai-messages.ts`
- Modify: `src/ai-handler.ts:121-140` (replace `buildMessages` method body with delegation)

- [ ] **Step 1: Create the standalone module**

Create `src/ai-messages.ts`:

```ts
export type AIMessage = { role: "user" | "assistant"; content: string };

export function buildAIMessages(prompt: string, currentCode: string): AIMessage[] {
  const messages: AIMessage[] = [];

  if (currentCode) {
    messages.push({
      role: "user",
      content: `Current diagram code:\n\`\`\`mermaid\n${currentCode}\n\`\`\``,
    });
    messages.push({
      role: "assistant",
      content: "I can see the current diagram. How would you like me to modify it?",
    });
  }

  messages.push({ role: "user", content: prompt });
  return messages;
}
```

- [ ] **Step 2: Update `src/ai-handler.ts` to use the extracted function**

Replace the existing `buildMessages` private method (`src/ai-handler.ts:121-140`) with a one-line delegation. Also add the import.

Add at the top of `src/ai-handler.ts` (after the existing imports):

```ts
import { buildAIMessages, AIMessage } from "./ai-messages";
```

Replace the entire `buildMessages` method (lines ~121-140) with:

```ts
  private buildMessages(prompt: string, currentCode: string): AIMessage[] {
    return buildAIMessages(prompt, currentCode);
  }
```

- [ ] **Step 3: Verify build still passes**

Run:
```bash
bun run typecheck
```

Expected: exit 0, no errors.

Then:
```bash
bun run build
```

Expected: build succeeds, dist/ produced. If TypeScript complains about the `AIMessage` import being unused (because the original method already had its own inline type), either keep the import (since the return type uses it) or remove the explicit return type annotation — both work.

- [ ] **Step 4: Commit**

```bash
git add src/ai-messages.ts src/ai-handler.ts
git commit -m "refactor(ai): extract buildMessages as pure function for testability"
```

---

### Task 6: Test `buildAIMessages`

**Files:**
- Create: `src/ai-messages.test.ts`

- [ ] **Step 1: Write the test**

Create `src/ai-messages.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildAIMessages } from "./ai-messages";

describe("buildAIMessages", () => {
  it("returns a single user message when currentCode is empty", () => {
    const result = buildAIMessages("make me a flowchart", "");
    expect(result).toEqual([{ role: "user", content: "make me a flowchart" }]);
  });

  it("includes context + assistant ack + new prompt when currentCode is present", () => {
    const code = "flowchart TD\n  A --> B";
    const result = buildAIMessages("add error handling", code);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      role: "user",
      content: `Current diagram code:\n\`\`\`mermaid\n${code}\n\`\`\``,
    });
    expect(result[1].role).toBe("assistant");
    expect(result[1].content).toMatch(/current diagram/i);
    expect(result[2]).toEqual({ role: "user", content: "add error handling" });
  });
});
```

- [ ] **Step 2: Run test**

Run:
```bash
bun run test:run src/ai-messages.test.ts
```

Expected: 2 passed.

- [ ] **Step 3: Commit**

```bash
git add src/ai-messages.test.ts
git commit -m "test(ai-messages): cover empty + populated currentCode paths"
```

---

### Task 7: Final verification + cleanup + README

**Files:**
- Delete: `src/sanity.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Run the full test suite**

Run:
```bash
bun run test:run
```

Expected:
```
 Test Files  4 passed (4)
      Tests  10 passed (10)
```

(2 sanity + 3 url + 4 parseError + 3 events + 2 buildAIMessages = 14, but we delete sanity next, so final count after Step 2 will be 12. Adjust expectation if deletion order differs.)

If anything fails, do not proceed — fix the failing test first.

- [ ] **Step 2: Delete the sanity test (no longer needed)**

Run:
```bash
rm src/sanity.test.ts
```

Then re-run:
```bash
bun run test:run
```

Expected:
```
 Test Files  3 passed (3)
      Tests  12 passed (12)
```

- [ ] **Step 3: Run typecheck**

Run:
```bash
bun run typecheck
```

Expected: exit 0, no output (clean).

- [ ] **Step 4: Update README**

In `README.md`, find the `## Getting Started` section. After the `4. Start the development server:` block, add a new section:

```markdown
### Running Tests

```bash
bun run test         # Watch mode
bun run test:run     # Single run (CI)
bun run typecheck    # TypeScript check only
```

The test suite covers pure-logic surfaces (URL compression, error parsing, event bus, AI message building). DOM-heavy code is covered after the planned god-class refactor in Sub-Project 1.
```

(Note the closing triple-backtick of the inner code block needs to be present; when copy-pasting, ensure the inner code fence is balanced.)

- [ ] **Step 5: Final commit**

```bash
git add -u README.md src/sanity.test.ts package.json
git commit -m "test: finalize sub-project 0 — remove sanity test, document workflow"
```

---

## Verification Summary

After all 7 tasks:

| Check | Command | Expected |
|---|---|---|
| All tests pass | `bun run test:run` | 12 passed across 3 files |
| TypeScript clean | `bun run typecheck` | exit 0 |
| Build still works | `bun run build` | dist/ produced, no errors |
| Dev server still works | `bun run dev` (manual) | App loads, AI handler initializes |
| Git history | `git log --oneline -8` | 7 task commits + roadmap commit |

If all of the above pass, Sub-Project 0 is complete and Sub-Project 1 (refactor god class) is unblocked.

---

## Self-Review Notes

**Spec coverage (against `2026-04-27-mimaid-improvement-roadmap-design.md` § 4 Sub-Project 0):**

| Spec requirement | Covered? | Notes |
|---|---|---|
| Vitest + jsdom devDeps | ✓ Task 1 | |
| `vitest.config.ts` jsdom env | ✓ Task 1 | |
| `npm run test` script | ✓ Task 1 (`bun run test`) | |
| URL hash compression test | ✓ Task 2 | 3 tests including roundtrip |
| `parseMermaidError` tests | ✓ Task 3 | 4 patterns |
| Event bus emit/listen test | ✓ Task 4 | + once + unsubscribe |
| AI `buildMessages` test | ✓ Tasks 5+6 | extracted then tested |
| Stream parser test | ✗ Deferred | Documented in "Out of Scope"; defer to Sub-Project 1 |
| Mermaid render integration test | ✗ Deferred | Documented in "Out of Scope"; defer to Sub-Project 1 |
| `bun run test` exits 0 | ✓ Task 7 verification |
| All tests pass in <5s | ✓ Implicit (jsdom + pure logic, no I/O) |
| README documents `bun run test` | ✓ Task 7 |

**2 spec items intentionally deferred** with rationale documented in the "Out of Scope" section above. Net deliverable: 12 passing tests across 3 source files + 1 small purity-extracting refactor.

**Placeholder scan:** No "TBD", "TODO", "implement later", or untyped placeholders. All code blocks are complete and self-contained.

**Type consistency:**
- `AIMessage` type defined once in `ai-messages.ts`, imported by `ai-handler.ts` and used in `ai-messages.test.ts` indirectly (test asserts shape).
- `parseMermaidError` test signatures match `utils.ts` (returns `MermaidError` with `line`, `column`, `message`, `severity`, `source`).
- Event names (`"ai:start"`) match the `AppEvents` type in `events.ts`.

---

## Findings (discovered during execution)

- **Latent bug in `generateDiagramHash` (src/utils.ts:38-44):** When called with empty string, calls `window.history.replaceState(null, "", "")`. Per MDN, an empty URL string means "use current URL" — so the hash is NOT cleared (verified in jsdom; confirmed by behavior spec). Should use `window.location.hash = ""` or `window.history.replaceState(null, "", window.location.pathname + window.location.search)` instead. Defer fix to Sub-Project 5 (Quality Cleanup) or include in Sub-Project 1 (Refactor) if utils.ts is touched. The originally-planned third URL-hash test ("clears hash when given empty string") was dropped to keep Task 0 strictly to test-infra scope; re-add it after the bug is fixed.

- **Console.log debug noise during tests (src/utils.ts:96,126,137,145):** `parseMermaidError` emits `[DEBUG]` logs that pollute test output. Already noted in roadmap Sub-Project 5 — confirmed visible during this implementation. Strip when cleanup task runs.

- **Adjusted final test count:** 11 passing tests (not 12 as initially planned in Task 7) — accounts for the dropped third URL-hash test.
