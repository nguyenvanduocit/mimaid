# Minimal Mermaid Editor

A lightweight, browser-based Mermaid diagram editor with real-time preview and collaborative editing capabilities.

## Features

- 🎨 Real-time diagram preview
- 👥 Collaborative editing (when using room parameter)
- 📱 Responsive design with resizable editor
- 🔍 Pan and zoom preview
- 💾 Export diagrams as SVG or PNG
- 🎯 Smart code completion
- 🔗 Shareable diagram URLs
- 🎨 Syntax highlighting
- ⌨️ Auto-closing brackets
- 📝 Comment support

## Getting Started

### Prerequisites

- bun

### Installation

1. Clone the repository:
```bash
git clone https://github.com/nguyenvanduocit/mimaid.git
cd mimaid
```

2. Install dependencies:
```bash
bun install
```

3. Create a `.env` file in the root directory and add your Liveblocks API key (optional, only needed for collaborative editing):
```
VITE_LIVEBLOCKS_PUBLIC_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
bun run dev
```

## Usage

### Basic Usage

1. Write your Mermaid diagram syntax in the left editor pane
2. See the live preview in the right pane
3. Pan the preview by dragging
4. Zoom using mouse wheel
5. Resize the editor/preview split using the center handle

### Collaborative Editing

To enable collaborative editing, add the following URL parameters:
- `?room=your-room-name` - Creates/joins a collaborative room
- `?name=your-name` - Sets your display name (optional)

Example: `http://localhost:5173/?room=team-diagram&name=Alice`

Note: The URL hash contains the compressed diagram code, allowing for easy sharing without a server.


### View-Only Mode

To share a view-only version of your diagram:
1. Add `?hideEditor` to the URL
2. The editor will be hidden, showing only the diagram preview

### Exporting

- Click the "SVG" button to export as SVG
- Click the "PNG" button to export as PNG

## Technology Stack

The project uses several key technologies:

- Vite + TypeScript for development
- Monaco Editor for code editing
- Mermaid.js for diagram rendering
- Liveblocks + Yjs for collaboration
- LZ-String for URL compression

## License

This project is open source and available under the MIT license.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
