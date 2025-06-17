# Development Guide

## Development Setup

### Prerequisites

- **Node.js**: >= 18.0.0
- **Bun**: Latest version (preferred) or npm/yarn
- **Git**: Latest version
- **VSCode**: Recommended với TypeScript extensions

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd minimalmermaid

# Install dependencies
bun install

# Setup environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server
bun run dev
```

### Environment Configuration

#### `.env` file setup
```env
VITE_GOOGLE_AI_API_KEY=your_gemini_api_key
VITE_LIVEBLOCKS_PUBLIC_API_KEY=pk_live_your_liveblocks_key
```

#### VSCode Configuration

Recommended extensions:
- TypeScript và JavaScript Language Features
- Prettier - Code formatter
- ESLint
- Auto Rename Tag
- Bracket Pair Colorizer

#### `.vscode/settings.json`
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.mermaid": "plaintext"
  }
}
```

## Development Workflow

### Git Workflow

#### Branch Strategy
```bash
# Feature development
git checkout -b feature/feature-name
git commit -m "feat: add new feature"
git push origin feature/feature-name

# Bug fixes
git checkout -b fix/bug-description
git commit -m "fix: resolve issue with component"

# Documentation
git checkout -b docs/update-readme
git commit -m "docs: update API documentation"
```

#### Conventional Commits
```
feat: new feature
fix: bug fix
docs: documentation
style: formatting
refactor: code restructuring
test: adding tests
chore: maintenance
```

### Code Organization

#### File Structure
```
src/
├── main.ts              # Application entry point
├── types.ts             # Type definitions
├── config.ts            # Configuration objects
├── ai-handler.ts        # AI integration
├── collaboration.ts     # Real-time collaboration
├── utils.ts             # Utility functions
├── configMermaidLanguage.ts # Monaco language config
├── style.css            # Main styles
└── modern-normalize.css # CSS reset
```

#### Import Organization
```typescript
// External libraries
import mermaid from "mermaid";
import * as monaco from "monaco-editor";

// Internal modules (alphabetical)
import { AIHandler } from "./ai-handler";
import { CollaborationHandler } from "./collaboration";
import { EditorState, EditorElements } from "./types";
import { debounce, loadDiagramFromURL } from "./utils";

// Styles
import "./style.css";
```

### Coding Standards

#### TypeScript Guidelines

##### Type Definitions
```typescript
// Use interfaces for objects
interface EditorState {
  scale: number;
  translateX: number;
  translateY: number;
}

// Use types for unions và primitives
type DiagramType = 'flowchart' | 'sequence' | 'class';
type Theme = 'light' | 'dark';
```

##### Function Signatures
```typescript
// Explicit return types
function renderDiagram(code: string): Promise<void> {
  // implementation
}

// Generic functions
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  // implementation
}
```

##### Class Structure
```typescript
class MermaidEditor {
  // Private properties first
  private editor: monaco.editor.IStandaloneCodeEditor;
  private elements: EditorElements;
  
  // Constructor
  constructor() {
    this.initializeDOM();
  }
  
  // Public methods
  public exportToSvg(): void {
    // implementation
  }
  
  // Private methods
  private initializeDOM(): void {
    // implementation
  }
}
```

#### CSS Guidelines

##### BEM Methodology
```css
/* Block */
.editor-pane {
  display: flex;
}

/* Element */
.editor-pane__header {
  padding: 1rem;
}

/* Modifier */
.editor-pane--collapsed {
  width: 0;
}
```

##### CSS Custom Properties
```css
:root {
  --color-primary: #007acc;
  --color-secondary: #f5f5f5;
  --spacing-unit: 8px;
  --border-radius: 4px;
}

.button {
  background: var(--color-primary);
  padding: calc(var(--spacing-unit) * 2);
  border-radius: var(--border-radius);
}
```

### Performance Guidelines

#### Debouncing và Throttling
```typescript
// Debounce for infrequent events
const debouncedUpdatePreview = debounce(this.updatePreview.bind(this), 250);

// Throttle for frequent events
const throttledResize = throttle(this.handleResize.bind(this), 16); // 60fps
```

#### Memory Management
```typescript
class ComponentWithCleanup {
  private resizeObserver: ResizeObserver;
  
  constructor() {
    this.setupObservers();
  }
  
  private setupObservers(): void {
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.element);
  }
  
  public destroy(): void {
    this.resizeObserver?.disconnect();
  }
}
```

#### Lazy Loading
```typescript
// Lazy load collaboration features
async function enableCollaboration(): Promise<void> {
  if (window.location.search.includes('room')) {
    const { CollaborationHandler } = await import('./collaboration');
    return new CollaborationHandler(editor);
  }
}
```

### Testing Strategy

#### Unit Testing với Vitest
```typescript
// test/utils.test.ts
import { describe, it, expect } from 'vitest';
import { debounce, loadDiagramFromURL } from '../src/utils';

describe('Utils', () => {
  describe('debounce', () => {
    it('should delay function execution', async () => {
      let called = false;
      const debouncedFn = debounce(() => { called = true; }, 100);
      
      debouncedFn();
      expect(called).toBe(false);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(called).toBe(true);
    });
  });
});
```

#### Integration Testing
```typescript
// test/editor.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MermaidEditor } from '../src/main';

describe('MermaidEditor', () => {
  let editor: MermaidEditor;
  
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    editor = new MermaidEditor();
  });
  
  it('should initialize editor', () => {
    expect(editor).toBeDefined();
  });
});
```

#### E2E Testing với Playwright
```typescript
// e2e/basic-flow.spec.ts
import { test, expect } from '@playwright/test';

test('should render diagram from code', async ({ page }) => {
  await page.goto('/');
  
  await page.fill('#monaco-editor', 'graph TD\nA --> B');
  await page.waitForSelector('#mermaid-preview svg');
  
  const svg = await page.locator('#mermaid-preview svg');
  await expect(svg).toBeVisible();
});
```

### Debugging

#### Development Tools
```typescript
// Enable debug mode
if (import.meta.env.DEV) {
  window.DEBUG_MODE = true;
  window.editor = editor; // Global access for debugging
}

// Debug utilities
function debugState(): void {
  console.group('Editor State');
  console.log('Scale:', state.scale);
  console.log('Position:', { x: state.translateX, y: state.translateY });
  console.groupEnd();
}
```

#### Error Handling
```typescript
// Global error handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  if (import.meta.env.DEV) {
    // Show detailed error in development
    alert(`Error: ${event.reason}`);
  }
});

// Component-level error boundaries
class SafeComponent {
  async execute(): Promise<void> {
    try {
      await this.riskyOperation();
    } catch (error) {
      this.handleError(error);
    }
  }
  
  private handleError(error: unknown): void {
    console.error('Component error:', error);
    // Graceful degradation
    this.fallbackBehavior();
  }
}
```

### Build và Deployment

#### Development Build
```bash
# Start dev server
bun run dev

# Build for development
bun run build:dev
```

#### Production Build
```bash
# Build for production
bun run build

# Preview production build
bun run preview

# Analyze bundle size
bun run analyze
```

#### Build Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({ filename: 'dist/stats.html' })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['monaco-editor', 'mermaid'],
          ai: ['@google/genai'],
          collaboration: ['@liveblocks/client', 'yjs']
        }
      }
    }
  }
});
```

### Code Review Checklist

#### Functionality
- [ ] Code works as expected
- [ ] Edge cases handled
- [ ] Error handling implemented
- [ ] Performance considerations

#### Code Quality
- [ ] TypeScript types properly defined
- [ ] Functions are focused và single-purpose
- [ ] Naming is clear và consistent
- [ ] Comments explain "why", not "what"

#### Architecture
- [ ] Follows established patterns
- [ ] Proper separation of concerns
- [ ] Dependencies are minimal
- [ ] Interfaces are stable

#### Testing
- [ ] Unit tests written
- [ ] Integration tests cover workflows
- [ ] E2E tests for critical paths
- [ ] Manual testing completed

### Release Process

#### Version Management
```bash
# Update version
npm version patch|minor|major

# Tag release
git tag v1.0.0
git push origin v1.0.0

# Generate changelog
conventional-changelog -p angular -i CHANGELOG.md -s
```

#### Release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Version bumped
- [ ] Changelog generated
- [ ] Security review completed
- [ ] Performance benchmarks met

### Contributing Guidelines

#### Pull Request Process
1. Fork repository
2. Create feature branch
3. Implement changes với tests
4. Update documentation
5. Submit pull request
6. Address review feedback
7. Merge after approval

#### Code of Conduct
- Be respectful và inclusive
- Provide constructive feedback
- Focus on technical merit
- Help others learn và grow 