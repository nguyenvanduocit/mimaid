# Troubleshooting Guide

## Common Issues và Solutions

### AI Features Not Working

#### Issue: "❌ Failed to process prompt with AI"

**Possible Causes:**
- Missing hoặc invalid Google AI API key
- API key không có permissions
- Network connectivity issues
- API quota exceeded

**Solutions:**

1. **Check API Key Configuration**
```typescript
// Check in browser console
console.log(localStorage.getItem('googleAiApiKey'));

// Verify environment variable
console.log(import.meta.env.VITE_GOOGLE_AI_API_KEY);
```

2. **Validate API Key Format**
```typescript
function validateApiKey(key: string): boolean {
  return key && key.length > 20 && key.startsWith('AIza');
}
```

3. **Test API Connection**
```bash
curl -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
     -X POST \
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY"
```

4. **Reset API Key**
- Go to Settings (⚙️ icon)
- Clear current API token
- Enter new valid API key
- Save settings

#### Issue: AI generates invalid Mermaid code

**Solutions:**
1. **Improve Prompt Context**
```typescript
const systemPrompt = `You are a helpful assistant that creates valid Mermaid diagram code. 
ALWAYS wrap the code in \`\`\`mermaid tags. 
Ensure the syntax is valid and follows Mermaid specifications.
Think step by step before responding.`;
```

2. **Add Validation**
```typescript
function validateMermaidSyntax(code: string): boolean {
  try {
    mermaid.parse(code);
    return true;
  } catch (error) {
    console.error('Invalid Mermaid syntax:', error);
    return false;
  }
}
```

### Collaboration Issues

#### Issue: "Unable to connect to collaboration room"

**Possible Causes:**
- Missing Liveblocks API key
- Invalid room ID
- Network firewall blocking WebSocket connections
- Browser không support WebSocket

**Solutions:**

1. **Verify Liveblocks Configuration**
```typescript
// Check API key
console.log(import.meta.env.VITE_LIVEBLOCKS_PUBLIC_API_KEY);

// Verify room ID
console.log(new URLSearchParams(window.location.search).get('room'));
```

2. **Test WebSocket Connection**
```javascript
// In browser console
const ws = new WebSocket('wss://liveblocks.io');
ws.onopen = () => console.log('WebSocket connected');
ws.onerror = (error) => console.error('WebSocket error:', error);
```

3. **Check Network Configuration**
```bash
# Test connectivity
ping liveblocks.io
nslookup liveblocks.io
```

4. **Browser Support Check**
```javascript
if (!window.WebSocket) {
  console.error('WebSocket not supported');
}
```

#### Issue: Users không thấy real-time changes

**Solutions:**
1. **Check Y.js Binding**
```typescript
// Verify Monaco binding
console.log(yText.toString());
console.log(editor.getValue());
```

2. **Verify User Awareness**
```typescript
awareness.on('change', () => {
  console.log('Awareness states:', awareness.getStates());
});
```

### Editor Issues

#### Issue: Monaco Editor không load

**Possible Causes:**
- Monaco webpack worker issues
- CSP blocking worker scripts
- Missing monaco-editor files

**Solutions:**

1. **Check Monaco Worker Configuration**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

export default defineConfig({
  plugins: [
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'typescript', 'json']
    })
  ]
});
```

2. **Manual Worker Setup**
```typescript
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker();
    }
    return new editorWorker();
  },
};
```

3. **Update Content Security Policy**
```html
<meta http-equiv="Content-Security-Policy" 
      content="script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;">
```

#### Issue: Syntax highlighting không hoạt động

**Solutions:**
1. **Verify Language Registration**
```typescript
// Check if language is registered
console.log(monaco.languages.getLanguages());
```

2. **Re-register Mermaid Language**
```typescript
import { configureMermaidLanguage } from './configMermaidLanguage';
configureMermaidLanguage();
```

### Mermaid Rendering Issues

#### Issue: "Error: Parse error on line X"

**Common Mermaid Syntax Errors:**

1. **Missing Graph Declaration**
```mermaid
// ❌ Wrong
A --> B

// ✅ Correct
graph TD
    A --> B
```

2. **Invalid Node IDs**
```mermaid
// ❌ Wrong (spaces in ID)
graph TD
    Start Node --> End Node

// ✅ Correct
graph TD
    StartNode[Start Node] --> EndNode[End Node]
```

3. **Unclosed Quotes**
```mermaid
// ❌ Wrong
graph TD
    A["Unclosed quote] --> B

// ✅ Correct
graph TD
    A["Closed quote"] --> B
```

#### Issue: Diagram không render trong preview

**Solutions:**
1. **Check Mermaid Initialization**
```typescript
mermaid.initialize({
  startOnLoad: false,
  theme: 'default'
});
```

2. **Verify Container Element**
```typescript
const container = document.querySelector('#mermaid-preview');
if (!container) {
  console.error('Mermaid container not found');
}
```

3. **Clear Mermaid Cache**
```typescript
// Clear any cached diagrams
mermaid.initialize({ startOnLoad: false });
```

### Performance Issues

#### Issue: Editor lag khi typing

**Solutions:**
1. **Adjust Debounce Timing**
```typescript
// Increase debounce delay
const debouncedUpdatePreview = debounce(updatePreview, 500); // was 250
```

2. **Disable Heavy Features**
```typescript
const MONACO_CONFIG = {
  // Disable expensive features
  minimap: { enabled: false },
  folding: false,
  renderWhitespace: 'none',
  wordWrap: 'off'
};
```

3. **Monitor Memory Usage**
```typescript
// Check memory usage
if (performance.memory) {
  console.log('Memory usage:', {
    used: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
    total: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB'
  });
}
```

#### Issue: Large diagrams slow to render

**Solutions:**
1. **Implement Progressive Rendering**
```typescript
async function renderLargeDiagram(code: string): Promise<void> {
  if (code.length > 10000) {
    // Show loading indicator
    showLoadingIndicator();
    
    // Render with delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  await mermaid.render('mermaid-preview', code);
  hideLoadingIndicator();
}
```

2. **Optimize Diagram Structure**
```mermaid
// ❌ Complex nested subgraphs
graph TD
    subgraph A
        subgraph B
            subgraph C
                D --> E
            end
        end
    end

// ✅ Simpler structure
graph TD
    A --> B
    B --> C
    C --> D
```

### Export Issues

#### Issue: SVG export không hoạt động

**Solutions:**
1. **Check SVG Element**
```typescript
const svg = document.querySelector('#mermaid-preview svg');
if (!svg) {
  console.error('No SVG found to export');
  return;
}
```

2. **Fix SVG Namespace**
```typescript
function exportToSvg(): void {
  const svg = document.querySelector('#mermaid-preview svg');
  if (!svg) return;
  
  // Ensure proper namespace
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  
  const svgData = new XMLSerializer().serializeToString(svg);
  // ... rest of export logic
}
```

#### Issue: PNG export fails

**Solutions:**
1. **Check Canvas Support**
```typescript
function checkCanvasSupport(): boolean {
  const canvas = document.createElement('canvas');
  return !!(canvas.getContext && canvas.getContext('2d'));
}
```

2. **Handle CORS Issues**
```typescript
async function exportToPng(): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const img = new Image();
  img.crossOrigin = 'anonymous'; // Handle CORS
  
  // ... rest of export logic
}
```

### URL và State Issues

#### Issue: Diagram state không persist trong URL

**Solutions:**
1. **Check LZ-String Compression**
```typescript
import LZString from 'lz-string';

// Test compression
const testCode = 'graph TD\nA --> B';
const compressed = LZString.compressToEncodedURIComponent(testCode);
const decompressed = LZString.decompressFromEncodedURIComponent(compressed);

console.log('Original:', testCode);
console.log('Compressed:', compressed);
console.log('Decompressed:', decompressed);
console.log('Match:', testCode === decompressed);
```

2. **Verify URL Updates**
```typescript
function generateDiagramHash(code: string): void {
  if (code.trim().length > 0) {
    const compressedCode = LZString.compressToEncodedURIComponent(code);
    const newUrl = `${window.location.pathname}#${compressedCode}`;
    window.history.replaceState(null, "", newUrl);
    console.log('URL updated:', newUrl);
  }
}
```

### Development Issues

#### Issue: Hot reload không hoạt động

**Solutions:**
1. **Check Vite Configuration**
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    hmr: {
      overlay: true
    }
  }
});
```

2. **Clear Browser Cache**
```bash
# Hard refresh
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

#### Issue: TypeScript errors

**Solutions:**
1. **Update Type Definitions**
```bash
bun add -d @types/node
bun add -d @types/web
```

2. **Check tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": false,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve"
  }
}
```

## Debug Tools và Techniques

### Browser Developer Tools

#### Console Commands
```javascript
// Check application state
console.log('Editor:', window.editor);
console.log('Current code:', window.editor?.getValue());

// Debug configuration
console.log('Config:', {
  AI_CONFIG,
  EDITOR_CONFIG,
  MERMAID_CONFIG
});

// Check local storage
console.log('Local Storage:', Object.fromEntries(
  Object.entries(localStorage)
));
```

#### Network Tab
- Monitor API requests tới Google AI
- Check WebSocket connections tới Liveblocks
- Verify static asset loading

#### Application Tab
- Inspect localStorage values
- Check service worker status
- Monitor WebSocket connections

### Logging và Monitoring

#### Enable Debug Mode
```typescript
// Set debug flag
localStorage.setItem('debug', 'true');

// Or via URL
// ?debug=true

// Check debug mode
if (localStorage.getItem('debug') === 'true') {
  window.DEBUG_MODE = true;
}
```

#### Custom Logging
```typescript
class Logger {
  static debug(message: string, data?: any): void {
    if (window.DEBUG_MODE) {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }
  
  static error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error);
    
    // Report to monitoring service
    if (window.Sentry) {
      Sentry.captureException(error);
    }
  }
}
```

### Performance Profiling

#### Memory Leaks
```typescript
// Monitor memory usage
setInterval(() => {
  if (performance.memory) {
    const memory = performance.memory;
    console.log('Memory:', {
      used: Math.round(memory.usedJSHeapSize / 1048576),
      total: Math.round(memory.totalJSHeapSize / 1048576),
      limit: Math.round(memory.jsHeapSizeLimit / 1048576)
    });
  }
}, 5000);
```

#### Performance Monitoring
```typescript
// Monitor render performance
function measureRenderTime(): void {
  const start = performance.now();
  
  // Render operation
  mermaid.render('preview', code).then(() => {
    const end = performance.now();
    console.log(`Render time: ${end - start}ms`);
  });
}
```

## Getting Help

### Community Support
- GitHub Issues: Report bugs và feature requests
- Discord/Slack: Real-time community support
- Stack Overflow: Technical questions

### Documentation
- API Reference: Detailed method documentation
- Examples: Code samples và tutorials
- FAQ: Frequently asked questions

### Professional Support
- Consulting services
- Custom development
- Enterprise support 