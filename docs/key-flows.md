# Key Flows

This document describes the critical execution paths in the MinimalMermaid application.

## Application Initialization Flow

**Trigger**: Browser loads index.html, which imports main.ts at line 255

**Outcome**: Fully initialized MermaidEditor with Monaco Editor loaded, event handlers wired, handlers set up, and initial diagram rendered from URL hash if present.

```mermaid
sequenceDiagram
    participant Browser
    participant HTML as index.html
    participant Main as main.ts
    participant Monaco as Monaco Editor
    participant Mermaid as mermaid.js
    participant EventBus as eventBus
    participant AI as AIHandler
    participant Collab as CollaborationHandler

    Browser->>HTML: Load page
    HTML->>Main: Import and execute main.ts
    Main->>Main: new MermaidEditor() (line 1503)
    Main->>Main: constructor() calls initializeApplication() (line 85-102)

    Main->>Main: initializeDOM() - cache element references (line 104-107)
    Main->>Main: handleEditorVisibility() - check ?hideEditor param (line 125-136)
    Main->>Main: setupEditor() - lazy load Monaco (line 148-183)
    Main->>Monaco: loadMonaco() - dynamic import (line 34-46)
    Monaco-->>Main: monaco instance

    Main->>Monaco: editor.create() - create editor instance (line 155-158)
    Main->>Main: setupEditorEventListeners() - wire onDidChangeModelContent (line 219-238)
    Main->>Main: setupHandlers() - init AI and Collab handlers (line 185-205)

    alt API key exists
        Main->>AI: new AIHandler(editor, elements) (line 192)
        AI->>EventBus: Listen for ui:input:submit (line 48-51)
        AI->>EventBus: Listen for ui:preset:select (line 53-71)
    end

    alt ?room= in URL
        Main->>Collab: new CollaborationHandler(editor) (line 202)
        Collab->>EventBus: Listen for collab:connect (line 21-23)
        Collab->>Collab: setup() - emit collab:connect event (line 30-38)
    end

    Main->>Mermaid: initializeMermaid() - mermaid.initialize() (line 207-214)
    Main->>Main: setupEventListeners() - wire UI event handlers (line 240-255)
    Main->>Main: setupAppEventListeners() - wire event bus listeners (line 257-289)

    Main->>EventBus: Emit app:ready (line 101)
    Main->>Main: loadInitialState() - restore editor width (line 609-614)
    Main->>Main: setupPresets() - populate preset grid (line 99)
```

## AI Diagram Generation Flow

**Trigger**: User enters prompt and presses Enter, or clicks a preset

**Outcome**: AI generates Mermaid code, streams it into the editor, and the diagram preview updates automatically.

```mermaid
sequenceDiagram
    participant User
    participant Input as input-field
    participant EventBus as eventBus
    participant AI as AIHandler
    participant Provider as AI Provider API
    participant Editor as Monaco Editor
    participant Preview as Preview Pane

    User->>Input: Enter prompt text
    Input->>EventBus: keydown event - Enter key (main.ts:294-302)
    EventBus->>EventBus: Emit ui:input:submit {prompt} (main.ts:299)

    Note over AI: AIHandler listens for ui:input:submit (ai-handler.ts:48-51)
    AI->>AI: handleSubmit() (ai-handler.ts:76-110)
    AI->>EventBus: Emit ai:start (ai-handler.ts:113)
    AI->>EventBus: Emit app:loading (ai-handler.ts:114)
    AI->>AI: startGeneration() - disable editor/input (ai-handler.ts:112-116)

    AI->>AI: buildMessages() - with current code context (ai-handler.ts:121-140)
    AI->>AI: getModel() - get configured provider (ai-handler.ts:12-21)
    AI->>Provider: streamText() with messages (ai-handler.ts:88-93)

    loop Stream chunks
        Provider-->>AI: textStream chunk
        AI->>AI: handleStream() - extract code from markdown (ai-handler.ts:192-227)
        AI->>Editor: setValue(code) - update editor (ai-handler.ts:220)
        Editor->>EventBus: onDidChangeModelContent fires (main.ts:225-237)
        EventBus->>EventBus: Emit editor:change {code} (main.ts:221)

        Note over Preview: Editor change listener (main.ts:259-261)
        EventBus->>Preview: renderMermaidDiagram(code) (main.ts:491-504)
        Preview->>Preview: validateAndRenderDiagram() (main.ts:523-537)
        Preview->>Preview: setupPanZoom() - enable pan/zoom (main.ts:561-575)
        Preview->>EventBus: Emit diagram:rendered (main.ts:534)
    end

    Provider-->>AI: stream complete
    AI->>EventBus: Emit ai:complete (ai-handler.ts:104)
    AI->>AI: finishGeneration() - re-enable editor (ai-handler.ts:187-190)
```

## Diagram Preview Rendering Flow

**Trigger**: Editor content changes (debounced by 250ms)

**Outcome**: Mermaid diagram is rendered to SVG and displayed in preview pane with pan/zoom enabled.

```mermaid
sequenceDiagram
    participant Editor as Monaco Editor
    participant EventBus as eventBus
    participant Main as MermaidEditor
    participant Mermaid as mermaid.js
    participant Preview as mermaid-preview DIV
    participant PanZoom as svg-pan-zoom

    Editor->>Editor: User types code
    Editor->>EventBus: onDidChangeModelContent (main.ts:225)
    EventBus->>EventBus: debouncedEmitChange (250ms delay) (main.ts:220-222)

    Note over Main: Listens for editor:change (main.ts:259-261)
    EventBus->>Main: renderMermaidDiagram(code) (main.ts:491)

    alt Code is empty
        Main->>Main: hideError() (main.ts:496-497)
        Main-->>EventBus: Return early
    end

    Main->>Main: clearPreview() (main.ts:509-511)
    Main->>Mermaid: parse(code) - validate syntax (main.ts:524)

    alt Parse fails
        Mermaid-->>Main: throw error
        Main->>Main: handleRenderError() (main.ts:580-588)
        Main->>EventBus: Emit diagram:error (main.ts:605)
        Main->>Main: showError() - show error overlay (main.ts:616-619)
        Main->>Main: setErrorMarkers() - Monaco inline errors (main.ts:653-666)
        Main->>Main: showFixWithAIOption() - show AI fix button (main.ts:953-1009)
    end

    Mermaid-->>Main: parse success
    Main->>Main: createTempRenderDiv() - hidden div for rendering (main.ts:542-548)
    Main->>Mermaid: render(id, code, tempDiv) (main.ts:529)
    Mermaid-->>Main: {svg: string}
    Main->>Preview: innerHTML = svg (main.ts:554)
    Main->>Main: hideError() - clear any previous errors (main.ts:555)

    Main->>PanZoom: svgPanZoom(svg, options) (main.ts:567-573)
    PanZoom-->>Main: panZoom instance
    Main->>EventBus: Emit diagram:rendered {svg} (main.ts:534)

    Note over Main: Also updates URL hash with compressed code (main.ts:223)
```

## Real-Time Collaboration Flow

**Trigger**: User accesses URL with ?room=roomId parameter

**Outcome**: User connects to Liveblocks room, Y.js CRDT syncs editor content, cursor awareness shows other users.

```mermaid
sequenceDiagram
    participant User
    participant URL as Browser URL
    participant Collab as CollaborationHandler
    participant EventBus as eventBus
    participant Liveblocks as Liveblocks Client
    participant Yjs as Y.js Doc
    participant Provider as YjsProvider
    participant Binding as MonacoBinding
    participant Editor as Monaco Editor

    User->>URL: Navigate to ?room=myRoom&name=Alice
    URL->>Collab: setup() called (main.ts:203)
    Collab->>Collab: getRoomIdFromURL() - extract room param (collaboration.ts:31)
    Collab->>EventBus: Emit collab:connect {room, name} (collaboration.ts:37)

    Note over Collab: Listens for collab:connect (collaboration.ts:21-23)
    EventBus->>Collab: connectToRoom(roomId, userName) (collaboration.ts:40-78)

    Collab->>Liveblocks: createClient({publicApiKey}) (collaboration.ts:42-44)
    Collab->>Liveblocks: client.enterRoom(roomId) (collaboration.ts:46)
    Liveblocks-->>Collab: room instance

    Collab->>Yjs: new Y.Doc() (collaboration.ts:49)
    Collab->>Yjs: getText("monaco") - get shared text (collaboration.ts:50)
    Collab->>Provider: new LiveblocksYjsProvider(room, yDoc) (collaboration.ts:51)
    Provider-->>Collab: awareness instance (collaboration.ts:52)

    Collab->>Provider: awareness.setLocalState({color, name}) (collaboration.ts:56)

    Note over Provider: Awareness change events
    Provider->>EventBus: Emit collab:user:join {users} (collaboration.ts:61)

    Collab->>Binding: new MonacoBinding(yText, model, editors, awareness) (collaboration.ts:64-69)

    Note over Binding: Two-way sync established
    Binding->>Editor: Y.js changes applied to editor
    Editor->>Binding: Editor changes applied to Y.js
    Binding->>Provider: Broadcast to other users

    Note over Provider: Remote user joins
    Provider->>Provider: awareness.on('change') fires
    Provider->>EventBus: Emit collab:user:join (collaboration.ts:61)

    alt Disconnect requested
        EventBus->>Collab: collab:disconnect event
        Collab->>Liveblocks: room.leave() (collaboration.ts:82)
    end
```

## Error Handling with AI Fix Flow

**Trigger**: Mermaid parse fails during diagram rendering

**Outcome**: Error displayed in overlay and Monaco editor, AI fix button shown if API key available.

```mermaid
sequenceDiagram
    participant Editor as Monaco Editor
    participant EventBus as eventBus
    participant Main as MermaidEditor
    participant Mermaid as mermaid.js
    participant Overlay as error-overlay
    participant AI as AIHandler

    Editor->>EventBus: editor:change with invalid code (main.ts:259)
    EventBus->>Main: renderMermaidDiagram(code) (main.ts:260)
    Main->>Mermaid: parse(code) (main.ts:524)
    Mermaid-->>Main: throw Error("Parse error on line 3")

    Main->>Main: handleRenderError(error, code) (main.ts:580-588)
    Main->>Main: processErrorMarkers() (main.ts:584)
    Main->>Main: setErrorMarkers(message, code) (main.ts:653)

    Main->>Main: parseMermaidError() - extract line/column (utils.ts:94-147)
    Main->>Editor: setModelMarkers(markers) (main.ts:664)
    Main->>Editor: deltaDecorations() - red underline (main.ts:756-766)

    Main->>EventBus: Emit diagram:error (main.ts:605)
    Main->>EventBus: Emit editor:error (main.ts:606)
    Main->>Overlay: showError() - display error text (main.ts:586, 616-619)

    Main->>Main: showFixWithAIOption() (main.ts:587, 953-1009)

    alt API key available in localStorage
        Main->>Main: Create "Fix with AI" button (main.ts:970-989)
        Main->>Main: Attach click handler (main.ts:984-986)
    else No API key
        Main->>Main: Show "Set up API key" warning (main.ts:990-1008)
    end

    Note over User: User clicks "Fix with AI" button
    User->>Main: handleFixWithAI() (main.ts:1011-1064)
    Main->>Main: Build fix prompt with error context (main.ts:1018-1027)
    Main->>Input: inputField.value = fixPrompt (main.ts:1052)

    Main->>AI: handleSubmit() (main.ts:1063)
    AI->>EventBus: Emit ai:start
    AI->>Editor: setValue(fixedCode) - streams corrected code

    Note over Editor: Fixed code triggers render flow
    Editor->>EventBus: editor:change with fixed code
    EventBus->>Main: renderMermaidDiagram(fixedCode)
    Main->>Main: hideError() - clear error state (main.ts:633-648)
    Main->>Editor: setModelMarkers([]) - clear error markers (main.ts:792)
```

## Share/Collaboration Link Generation Flow

**Trigger**: User clicks Share button and selects link type

**Outcome**: Appropriate URL copied to clipboard with room ID, embed mode, or diagram hash.

```mermaid
sequenceDiagram
    participant User
    participant ShareBtn as share-btn
    participant ShareModal as share-modal
    participant Clipboard as navigator.clipboard
    participant Preview as share-url-preview

    User->>ShareBtn: Click share button
    ShareBtn->>ShareModal: Toggle visibility (main.ts:1421-1428)
    ShareModal-->>User: Show modal with 3 options

    Note over User: Option 1 - Copy Link
    User->>ShareBtn: Click "Copy Link"
    ShareBtn->>Clipboard: writeText(window.location.href) (main.ts:1477)
    Clipboard-->>ShareBtn: Success
    ShareBtn->>Preview: Show URL preview (main.ts:1445-1449)
    ShareBtn-->>User: Show "Copied!" state

    Note over User: Option 2 - Collaborate
    User->>ShareBtn: Click "Collaborate"
    ShareBtn->>ShareBtn: generateRoomId() - random 8-char (main.ts:1436-1438)
    ShareBtn->>Clipboard: writeText(baseUrl + ?room=roomId + hash) (main.ts:1484-1487)
    ShareBtn->>Preview: Show collab URL preview
    ShareBtn-->>User: Show "Copied!" state

    Note over User: Option 3 - Embed URL
    User->>ShareBtn: Click "Embed URL"
    ShareBtn->>Clipboard: writeText(baseUrl + ?hideEditor + hash) (main.ts:1492-1496)
    ShareBtn->>Preview: Show embed URL preview
    ShareBtn-->>User: Show "Copied!" state

    Note over User: Recipient opens collab link
    User->>Collab: URL with ?room=roomId
    Collab->>Collab: See Collaboration Flow above
```
