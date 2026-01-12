export const SKILL_CONTENT = `---
name: mimaid
description: Generate shareable MinimalMermaid diagram URLs. Use when user asks for mermaid diagram links, wants to share diagrams, or mentions mimaid/minimalmermaid.
---
# MinimalMermaid URL Generator

Base URL: \`https://mimaid.aiocean.dev/\`

## How It Works

MinimalMermaid stores diagram code in the URL hash using LZ-String compression:
- Compression: \`LZString.compressToEncodedURIComponent(code)\`
- Decompression: \`LZString.decompressFromEncodedURIComponent(hash)\`

## Generating URLs

Use JavaScript to generate shareable URLs:

\`\`\`javascript
// Using lz-string library
const LZString = require('lz-string');

const mermaidCode = \\\`flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Do Something]
    B -->|No| D[Do Nothing]
    C --> E[End]
    D --> E\\\`;

const compressed = LZString.compressToEncodedURIComponent(mermaidCode);
const url = \\\`https://mimaid.aiocean.dev/#\\\${compressed}\\\`;
console.log(url);
\`\`\`

## Quick Generation (Bash)

\`\`\`bash
# Install lz-string if needed
bun add -g lz-string

# Generate URL using Node/Bun
bun -e "
const LZString = require('lz-string');
const code = \\\\\\\`flowchart TD
    A --> B\\\\\\\`;
console.log('https://mimaid.aiocean.dev/#' + LZString.compressToEncodedURIComponent(code));
"
\`\`\`

## URL Parameters

| Parameter | Usage | Description |
|-----------|-------|-------------|
| \`#<hash>\` | \`/#CYew5g...\` | Compressed diagram code (required for sharing) |
| \`?room=<id>\` | \`?room=myroom\` | Enable real-time collaboration |
| \`?name=<name>\` | \`?name=Alice\` | Set display name for collaboration |
| \`?hideEditor\` | \`?hideEditor\` | View-only mode (hides editor pane) |

## Common Patterns

### Share a Diagram
\`\`\`javascript
const LZString = require('lz-string');
const code = \\\`your mermaid code here\\\`;
const hash = LZString.compressToEncodedURIComponent(code);
console.log(\\\`https://mimaid.aiocean.dev/#\\\${hash}\\\`);
\`\`\`

### Collaborate on a Diagram
\`\`\`
https://mimaid.aiocean.dev/?room=project-planning&name=Alice#<hash>
\`\`\`

### Embed View-Only
\`\`\`
https://mimaid.aiocean.dev/?hideEditor#<hash>
\`\`\`

## Supported Diagram Types

All Mermaid diagram types are supported:
- \`flowchart\` / \`graph\` - Flow diagrams
- \`sequenceDiagram\` - Sequence diagrams
- \`classDiagram\` - Class diagrams
- \`stateDiagram-v2\` - State diagrams
- \`erDiagram\` - Entity relationship diagrams
- \`gantt\` - Gantt charts
- \`pie\` - Pie charts
- \`mindmap\` - Mind maps
- \`timeline\` - Timelines
- \`gitgraph\` - Git graphs

## Features

- **AI-Powered**: Generate diagrams using natural language with Google Gemini
- **Real-time Collaboration**: Multiple users can edit simultaneously
- **Auto-Save**: URL updates automatically as you type
- **Pan & Zoom**: Navigate large diagrams easily
- **Syntax Highlighting**: Monaco editor with Mermaid support
`;
