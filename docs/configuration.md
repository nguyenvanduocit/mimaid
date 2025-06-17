# Configuration Documentation

## Overview

MinimalMermaid sử dụng một hệ thống configuration linh hoạt với multiple sources: environment variables, localStorage, và default configs.

## Environment Variables

### Required Variables

#### `VITE_GOOGLE_AI_API_KEY`
- **Type**: String
- **Required**: Yes (for AI features)
- **Description**: Google Generative AI API key cho Gemini model
- **Example**: `export VITE_GOOGLE_AI_API_KEY="your-api-key-here"`

#### `VITE_LIVEBLOCKS_PUBLIC_API_KEY`
- **Type**: String  
- **Required**: Yes (for collaboration)
- **Description**: Liveblocks public API key cho real-time collaboration
- **Example**: `export VITE_LIVEBLOCKS_PUBLIC_API_KEY="pk_live_your-key"`

### Environment Setup

#### Development (.env)
```env
VITE_GOOGLE_AI_API_KEY=your_gemini_api_key
VITE_LIVEBLOCKS_PUBLIC_API_KEY=pk_live_your_liveblocks_key
```

#### Production
Set environment variables trên hosting platform:
```bash
# Vercel
vercel env add VITE_GOOGLE_AI_API_KEY
vercel env add VITE_LIVEBLOCKS_PUBLIC_API_KEY

# Netlify
netlify env:set VITE_GOOGLE_AI_API_KEY your_key
netlify env:set VITE_LIVEBLOCKS_PUBLIC_API_KEY your_key
```

## Configuration Objects

### Editor Configuration

```typescript
interface EditorConfig {
  minScale: number;      // Minimum zoom scale
  maxScale: number;      // Maximum zoom scale  
  minWidth: number;      // Minimum editor width (px)
  zoomFactor: number;    // Zoom step size
}

export const EDITOR_CONFIG: EditorConfig = {
  minScale: 0.5,         // 50% minimum zoom
  maxScale: 20,          // 2000% maximum zoom
  minWidth: 20,          // 20px minimum width
  zoomFactor: 0.1,       // 10% zoom steps
};
```

### AI Configuration

```typescript
interface AIConfig {
  apiKey: string;        // API key from env or localStorage
  model: string;         // Gemini model version
  temperature: number;   // Response creativity (0-2)
  maxTokens: number;     // Maximum response length
}

export const AI_CONFIG: AIConfig = {
  apiKey: localStorage.getItem('googleAiApiKey') || 
          import.meta.env.VITE_GOOGLE_AI_API_KEY,
  model: 'gemini-2.5-flash-preview-05-20',
  temperature: 1,        // Balanced creativity
  maxTokens: 64000,      // Large responses
};
```

### Mermaid Configuration

```typescript
export const MERMAID_CONFIG = {
  startOnLoad: false,    // Manual initialization
  theme: 'default',      // Default Mermaid theme
  logLevel: 'warn',      // Logging level
  securityLevel: 'loose' // Security restrictions
};
```

### Monaco Editor Configuration

```typescript
export const MONACO_CONFIG = {
  language: 'mermaid',           // Custom Mermaid language
  theme: 'mermaid',              // Custom theme
  minimap: { enabled: false },   // Disable minimap
  scrollBeyondLastLine: false,   // Disable extra scrolling
  automaticLayout: true,         // Auto-resize
  fontSize: 14,                  // Font size
  lineNumbers: 'on',             // Show line numbers
  wordWrap: 'on',               // Enable word wrap
  folding: true,                 // Enable code folding
  renderWhitespace: 'selection', // Show whitespace on selection
  tabSize: 2,                    // Tab size
  insertSpaces: true,            // Use spaces instead of tabs
};
```

## Runtime Configuration

### Local Storage Settings

#### API Key Storage
```typescript
// Save API key
localStorage.setItem('googleAiApiKey', 'your-api-key');

// Retrieve API key
const apiKey = localStorage.getItem('googleAiApiKey');
```

#### Editor Preferences
```typescript
// Save editor width
localStorage.setItem('editorWidth', '50%');

// Get editor width
const width = localStorage.getItem('editorWidth') || '50%';
```

#### User Settings
```typescript
// Theme preference
localStorage.setItem('theme', 'dark');

// Language preference  
localStorage.setItem('language', 'en');
```

### URL Parameters

#### Collaboration Parameters
```
?room=my-room&name=john-doe
```

- `room`: Room ID cho collaboration session
- `name`: User name hiển thị trong collaboration

#### Display Parameters
```
?hideEditor=true
```

- `hideEditor`: Ẩn editor pane, chỉ hiển thị preview

#### Example URLs
```
# Basic collaboration
https://app.com/?room=team-meeting&name=Alice

# Hide editor mode
https://app.com/?hideEditor=true

# Combined parameters
https://app.com/?room=presentation&name=Speaker&hideEditor=true
```

### URL Hash State

#### Diagram State Compression
```typescript
// Compress diagram code vào URL hash
const compressedCode = LZString.compressToEncodedURIComponent(code);
window.location.hash = compressedCode;

// Load diagram từ URL hash
const code = LZString.decompressFromEncodedURIComponent(window.location.hash.slice(1));
```

## Advanced Configuration

### Custom Monaco Themes

```typescript
// Define custom theme
monaco.editor.defineTheme('custom-mermaid', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword.mermaid', foreground: '#569cd6' },
    { token: 'string.mermaid', foreground: '#ce9178' },
    { token: 'comment.mermaid', foreground: '#6a9955' },
  ],
  colors: {
    'editor.background': '#1e1e1e',
    'editor.foreground': '#d4d4d4',
  }
});
```

### Custom Mermaid Themes

```typescript
// Apply custom Mermaid theme
mermaid.initialize({
  theme: 'base',
  themeVariables: {
    primaryColor: '#ff6b6b',
    primaryTextColor: '#fff',
    primaryBorderColor: '#ff5252',
    lineColor: '#ffa726',
    secondaryColor: '#4fc3f7',
    tertiaryColor: '#fff'
  }
});
```

### Performance Configuration

```typescript
// Debounce timing
const DEBOUNCE_DELAYS = {
  preview: 250,      // Preview update delay
  hash: 250,         // URL hash update delay
  save: 1000,        // Auto-save delay
  resize: 16,        // Resize throttle (60fps)
};

// Memory limits
const MEMORY_LIMITS = {
  maxHistorySize: 100,    // Undo/redo history
  maxCacheSize: 50,       // Diagram cache
  gcInterval: 60000,      // Garbage collection interval
};
```

## Configuration Validation

### Environment Variable Validation
```typescript
function validateEnvironment(): void {
  const requiredVars = [
    'VITE_GOOGLE_AI_API_KEY',
    'VITE_LIVEBLOCKS_PUBLIC_API_KEY'
  ];
  
  const missing = requiredVars.filter(
    key => !import.meta.env[key]
  );
  
  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
  }
}
```

### Runtime Configuration Check
```typescript
function validateConfiguration(): boolean {
  // Check AI configuration
  if (!AI_CONFIG.apiKey) {
    console.error('Google AI API key not configured');
    return false;
  }
  
  // Check editor limits
  if (EDITOR_CONFIG.minScale >= EDITOR_CONFIG.maxScale) {
    console.error('Invalid zoom scale configuration');
    return false;
  }
  
  return true;
}
```

## Configuration Migration

### Version Compatibility
```typescript
function migrateConfiguration(): void {
  const version = localStorage.getItem('configVersion') || '1.0.0';
  
  switch (version) {
    case '1.0.0':
      // Migrate from v1.0.0 to current
      migrateFromV1();
      break;
    default:
      // Current version
      break;
  }
  
  localStorage.setItem('configVersion', CURRENT_VERSION);
}
```

### Settings Import/Export
```typescript
// Export settings
function exportSettings(): string {
  const settings = {
    editorWidth: localStorage.getItem('editorWidth'),
    theme: localStorage.getItem('theme'),
    // ... other settings
  };
  return JSON.stringify(settings);
}

// Import settings
function importSettings(settingsJson: string): void {
  try {
    const settings = JSON.parse(settingsJson);
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== null) {
        localStorage.setItem(key, value);
      }
    });
  } catch (error) {
    console.error('Failed to import settings:', error);
  }
}
```

## Security Configuration

### API Key Security
```typescript
// API key validation
function validateApiKey(key: string): boolean {
  return key.length > 20 && key.startsWith('AIza');
}

// Secure key storage
function secureStoreApiKey(key: string): void {
  if (validateApiKey(key)) {
    localStorage.setItem('googleAiApiKey', key);
  } else {
    throw new Error('Invalid API key format');
  }
}
```

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' 'unsafe-eval';
               style-src 'self' 'unsafe-inline';
               connect-src 'self' https://generativelanguage.googleapis.com https://liveblocks.io;
               img-src 'self' data:;">
```

## Troubleshooting Configuration

### Common Issues

#### API Key Not Working
1. Check key format: `AIzaSyA...`
2. Verify environment variable name
3. Check localStorage value
4. Validate API key permissions

#### Collaboration Not Connecting
1. Verify Liveblocks API key
2. Check room parameter in URL
3. Validate network connectivity
4. Check browser console for errors

#### Editor Performance Issues
1. Adjust debounce delays
2. Reduce zoom limits
3. Enable minimap if needed
4. Check memory usage

### Debug Configuration
```typescript
// Enable debug mode
window.DEBUG_MODE = true;

// Configuration debugging
function debugConfiguration(): void {
  console.group('Configuration Debug');
  console.log('Editor Config:', EDITOR_CONFIG);
  console.log('AI Config:', { ...AI_CONFIG, apiKey: '***' });
  console.log('Environment:', import.meta.env);
  console.log('Local Storage:', { ...localStorage });
  console.groupEnd();
}
``` 