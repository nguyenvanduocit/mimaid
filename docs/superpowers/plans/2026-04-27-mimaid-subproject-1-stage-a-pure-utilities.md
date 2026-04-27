# Sub-Project 1, Stage A: Pure Utilities Extraction Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract 4 pure-utility modules from `src/main.ts` with zero behavior change. This is Stage A of the Sub-Project 1 refactor (see `docs/superpowers/specs/2026-04-27-mimaid-subproject-1-refactor-design.md`). Stages B-E follow after Stage A validates the approach.

**Architecture:** Each task creates a new file in `src/ui/` or `src/ai/`, moves logic verbatim, replaces in-place callers in `main.ts` with imports. No state changes, no API changes, no event bus changes. Tests must remain at 12/12 passing throughout.

**Tech Stack:** TypeScript 5.6, Vite 5, Vitest, bun.

---

## Pre-flight Check

- [ ] **Verify clean baseline before starting**

Run:
```bash
git status              # must be clean
bun run test:run        # 12 passed
bun run typecheck       # clean
bun run build           # succeeds
```

All four must pass before starting Task 1. If any fail, do not proceed — investigate first.

---

### Task 1: Extract `Toast`

**Files:**
- Create: `src/ui/Toast.ts`
- Modify: `src/main.ts:677-687` (remove `private showToast`), and call sites at `src/main.ts:305, 505` (replace `this.showToast(...)` with `showToast(...)`)

- [ ] **Step 1: Create the new module**

Create `src/ui/Toast.ts`:

```ts
export type ToastType = "success" | "error";

export function showToast(message: string, type: ToastType = "success"): void {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.className = `toast-message toast-${type}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => document.body.removeChild(toast), 500);
  }, 4000);
}
```

- [ ] **Step 2: Add import to `src/main.ts`**

Locate the import block (top of `src/main.ts`, lines 1-27). Add this line after the other UI imports:

```ts
import { showToast } from "./ui/Toast";
```

- [ ] **Step 3: Remove the private method**

In `src/main.ts`, find this block (around lines 677-687):

```ts
  private showToast(message: string, type: "success" | "error" = "success"): void {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.className = `toast-message toast-${type}`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => document.body.removeChild(toast), 500);
    }, 4000);
  }
```

Delete the entire method (no replacement — callers will use the imported function instead).

- [ ] **Step 4: Update call sites**

Search `main.ts` for `this.showToast(`. Replace each with `showToast(` (drop the `this.` prefix). At time of writing there are 2 sites:
- ai:error handler (~line 305): `this.showToast(error, "error");` → `showToast(error, "error");`
- save settings success (~line 505): `this.showToast("Settings saved successfully!");` → `showToast("Settings saved successfully!");`

If grep finds more sites, update them too.

- [ ] **Step 5: Verify**

Run:
```bash
bun run typecheck && bun run test:run && bun run build
```

Expected: all pass, 12 tests still passing.

- [ ] **Step 6: Commit**

```bash
git add src/ui/Toast.ts src/main.ts
git commit -m "$(cat <<'EOF'
refactor(ui): extract showToast to src/ui/Toast.ts

Pure utility, no state — first extraction of sub-project 1 stage A.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Extract `setupModalDismiss` to `Modal`

**Files:**
- Create: `src/ui/Modal.ts`
- Modify: `src/main.ts:52-71` (remove function), call sites at `src/main.ts:508, 1392` (or wherever current `setupModalDismiss` is invoked)

- [ ] **Step 1: Create the new module**

Create `src/ui/Modal.ts`:

```ts
export function setupModalDismiss(
  modal: HTMLElement,
  trigger: HTMLElement,
  hiddenClass = "hidden",
): void {
  document.addEventListener("click", (e) => {
    if (
      !modal.contains(e.target as Node) &&
      !trigger.contains(e.target as Node) &&
      !modal.classList.contains(hiddenClass)
    ) {
      modal.classList.add(hiddenClass);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains(hiddenClass)) {
      modal.classList.add(hiddenClass);
    }
  });
}
```

- [ ] **Step 2: Add import in `src/main.ts`**

Add to imports:
```ts
import { setupModalDismiss } from "./ui/Modal";
```

- [ ] **Step 3: Remove the original function**

Delete the `function setupModalDismiss(...)` block at `src/main.ts:52-71`. The import now provides it; existing call sites continue to work unchanged because the function name is identical.

- [ ] **Step 4: Verify**

```bash
bun run typecheck && bun run test:run && bun run build
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/Modal.ts src/main.ts
git commit -m "$(cat <<'EOF'
refactor(ui): extract setupModalDismiss to src/ui/Modal.ts

Pure helper, no state. Callers unchanged (named import).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Extract icon SVG strings to `icons.ts`

**Files:**
- Create: `src/ui/icons.ts`
- Modify: `src/main.ts` (replace inline SVG `innerHTML` strings with constants)

This is the highest-payoff readability win — main.ts has ~10 places with inline 30-line SVG strings.

- [ ] **Step 1: Inventory inline SVG strings**

Run:
```bash
grep -n "innerHTML.*svg\|innerHTML = \`" /Users/firegroup/projects/mimaid/src/main.ts
```

Expected: locations include the fix-with-AI button (~1031-1036), API key warnings (~1052-1059, 1204-1211), input field placeholder (none — that's a placeholder attr not innerHTML), preset button (~1272-1277), preset card (~1299-1306), copy-skill success/restore (~1425, 1437), copy-link success/restore (~1517 or wherever), copy-collab success/restore, copy-embed success/restore.

- [ ] **Step 2: Create `src/ui/icons.ts`**

Create `src/ui/icons.ts` with each SVG as a named string constant. Match the exact SVG markup including attributes and whitespace. Example:

```ts
// Standard 16x16 icons
export const ICON_FIX_WITH_AI = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>`;

export const ICON_WARNING_TRIANGLE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

export const ICON_PRESET_GRID = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>`;

export const ICON_CHECKMARK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

export const ICON_CLIPBOARD = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
```

Add additional constants for any other inline SVGs you find in step 1. Name each `ICON_<DESCRIPTIVE>`.

- [ ] **Step 3: Replace each inline SVG in `main.ts`**

For each inline SVG identified in step 1, replace the literal SVG string with the imported constant. Example:

Before (around line 1031):
```ts
newFixButton.innerHTML = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="..."></path>
  </svg>
  Fix with AI
`;
```

After:
```ts
newFixButton.innerHTML = `${ICON_FIX_WITH_AI} Fix with AI`;
```

Add to imports:
```ts
import { ICON_FIX_WITH_AI, ICON_WARNING_TRIANGLE, ICON_PRESET_GRID, ICON_CHECKMARK, ICON_CLIPBOARD } from "./ui/icons";
```

(Adjust the import list to whatever icons you actually used.)

- [ ] **Step 4: Verify visual fidelity**

Run:
```bash
bun run typecheck && bun run test:run && bun run build
```

Plus, if possible, manually start `bun run dev` and click through:
- Trigger an error → "Fix with AI" button appears with correct icon
- Open settings → save → success toast
- Open preset card → preset icon visible
- Open share modal → click Copy Link → checkmark appears

- [ ] **Step 5: Commit**

```bash
git add src/ui/icons.ts src/main.ts
git commit -m "$(cat <<'EOF'
refactor(ui): centralize inline SVG strings into src/ui/icons.ts

Replaces ~10 inline 20-line SVG innerHTML literals with named constants.
Pure string-extraction; rendered DOM identical.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Extract provider-model fetchers to `ProviderModels`

**Files:**
- Create: `src/ai/ProviderModels.ts`
- Modify: `src/main.ts:953-1007` (remove the four `private` methods), update caller at `src/main.ts:404` (`this.fetchModelsForProvider` → `fetchModelsForProvider`)

- [ ] **Step 1: Create `src/ai/ProviderModels.ts`**

```ts
import { AIProviderType } from "../types";

export async function fetchModelsForProvider(
  provider: AIProviderType,
  apiKey: string,
): Promise<string[]> {
  switch (provider) {
    case "google":
      return fetchGoogleModels(apiKey);
    case "openai":
      return fetchOpenAIModels(apiKey);
    case "anthropic":
      return getAnthropicModels();
  }
}

async function fetchGoogleModels(apiKey: string): Promise<string[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
  );
  if (!response.ok) throw new Error("Failed to fetch Google models");

  const data = await response.json();
  return data.models
    .filter((m: { name: string; supportedGenerationMethods?: string[] }) =>
      m.supportedGenerationMethods?.includes("generateContent"),
    )
    .map((m: { name: string }) => m.name.replace("models/", ""))
    .sort();
}

async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error("Failed to fetch OpenAI models");

  const data = await response.json();
  return data.data
    .filter((m: { id: string }) => m.id.startsWith("gpt-"))
    .map((m: { id: string }) => m.id)
    .sort()
    .reverse();
}

function getAnthropicModels(): Promise<string[]> {
  // Anthropic doesn't have a public models list API, return known models
  return Promise.resolve([
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-3-7-sonnet-20250219",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
    "claude-3-haiku-20240307",
  ]);
}
```

Note the import path is `../types` because the file is now at `src/ai/`.

- [ ] **Step 2: Add import in `src/main.ts`**

```ts
import { fetchModelsForProvider } from "./ai/ProviderModels";
```

- [ ] **Step 3: Remove the four private methods**

Delete from `src/main.ts`:
- `private async fetchModelsForProvider(...)` (lines ~953-965)
- `private async fetchGoogleModels(...)` (lines ~967-980)
- `private async fetchOpenAIModels(...)` (lines ~982-994)
- `private getAnthropicModels()` (lines ~996-1007)

- [ ] **Step 4: Update the call site**

Find the call inside `setupSettingsListeners` (around line 404):
```ts
const models = await this.fetchModelsForProvider(provider, apiKey);
```

Replace with:
```ts
const models = await fetchModelsForProvider(provider, apiKey);
```

- [ ] **Step 5: Verify**

```bash
bun run typecheck && bun run test:run && bun run build
```

If possible, manually test: open settings → click model dropdown → models should fetch (with valid API key).

- [ ] **Step 6: Commit**

```bash
git add src/ai/ProviderModels.ts src/main.ts
git commit -m "$(cat <<'EOF'
refactor(ai): extract provider model fetchers to src/ai/ProviderModels.ts

Pure async functions, no shared state — moved verbatim. Caller uses
named import.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Stage A Verification Summary

After all 4 tasks, run final checks:

```bash
echo "===TESTS===" && bun run test:run 2>&1 | tail -6
echo "===TYPECHECK===" && bun run typecheck 2>&1 | tail -3
echo "===BUILD===" && bun run build 2>&1 | tail -5
echo "===LOC===" && wc -l src/main.ts src/ui/*.ts src/ai/*.ts
```

Expected:
- 12/12 tests pass
- typecheck clean
- build succeeds, dist size delta ≤ 5%
- `src/main.ts` shrunk from 1559 → ~1300 lines (-260 LOC)
- 4 new files created, all <100 LOC

If anything regresses, **revert the offending commit** (`git revert HEAD`) and re-evaluate. Do not push forward through a regression.

## What's NOT in This Plan

This plan covers Stage A only (Toast, Modal, icons, ProviderModels — 4 simple, low-risk extracts). Stages B-E (editor/render core, editor pane, error markers + AI fix, UI panels) get separate plans:

- `docs/superpowers/plans/2026-04-27-mimaid-subproject-1-stage-b-editor-render.md` (TBD)
- `docs/superpowers/plans/2026-04-27-mimaid-subproject-1-stage-c-editor-pane.md` (TBD)
- `docs/superpowers/plans/2026-04-27-mimaid-subproject-1-stage-d-errors-ai-fix.md` (TBD)
- `docs/superpowers/plans/2026-04-27-mimaid-subproject-1-stage-e-ui-panels.md` (TBD)

Each subsequent stage's plan should be written only AFTER the previous stage has landed and been smoke-tested in a real browser. This is intentional — each stage's structure informs the next.

## Self-Review

**Spec coverage:** Maps 1:1 to Stage A in section 6 of `docs/superpowers/specs/2026-04-27-mimaid-subproject-1-refactor-design.md`.

**Placeholder scan:** No TBD/TODO. Stage B-E plans intentionally deferred (called out with `(TBD)` annotations).

**Type consistency:** `AIProviderType` imported via `../types` in new file matches existing usage; `ToastType` is local to Toast.ts and doesn't need cross-file consistency.

**Risk:** All 4 tasks are pure-extraction — moving verbatim code with no logic changes. The only thing that can break is import paths or call-site references, both caught by typecheck. This is the safest possible refactor work.
