import mermaid from "mermaid";
import "./modern-normalize.css";
import "./style.css";
import LZString from "lz-string";
import * as monaco from "monaco-editor";
import { createClient } from "@liveblocks/client";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { Awareness } from "y-protocols/awareness";
import { configureMermaidLanguage } from "./configMermaidLanguage";
import Anthropic from "@anthropic-ai/sdk";

// Call the configuration function before creating the editor
configureMermaidLanguage();

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="container">
    <div class="editor-pane">
      <div class="status-bar">
        <div class="status-bar-left">
          <button id="settings-btn" class="button" title="Settings">Settings</button>
          <div id="settings-dialog" class="settings-dialog hidden">
            <div class="settings-content">
              <label for="api-token">Anthropic API Token:</label>
              <input type="password" id="api-token" />
              <button id="save-settings" class="button">Save</button>
            </div>
          </div>
          <span id="generation-status" class="status-text"></span>
        </div>
        <div class="status-bar-right">
        </div>
      </div>
      <div id="monaco-editor" class="editor"></div>
      <div id="input-area" class="input-area">
        <textarea id="input-field" placeholder="Enter your prompt here..."></textarea>
      </div>
    </div>
    <div class="resize-handle"></div>
    <div class="preview-pane" id="preview-pane">
      <div id="mermaid-preview"></div>
      <pre class="error-overlay"></pre>
      <div class="floating-controls">
        <button id="export-btn" title="Export as SVG">SVG</button>
        <button id="export-png-btn" title="Export as PNG">PNG</button>
      </div>
    </div>
  </div>
`;

// Add interfaces
interface EditorState {
  scale: number;
  translateX: number;
  translateY: number;
  isDragging: boolean;
  isResizing: boolean;
  startX: number;
  startY: number;
  zoomTranslateX: number;
  zoomTranslateY: number;
}

interface EditorConfig {
  minScale: number;
  maxScale: number;
  minWidth: number;
  zoomFactor: number;
}

// Configuration object
const CONFIG: EditorConfig = {
  minScale: 0.5,
  maxScale: 5,
  minWidth: 20,
  zoomFactor: 0.1,
};

// State management
const state: EditorState = {
  scale: 1,
  translateX: 0,
  translateY: 0,
  isDragging: false,
  isResizing: false,
  startX: 0,
  startY: 0,
  zoomTranslateX: 0,
  zoomTranslateY: 0,
};

class MermaidEditor {
  private editor!: monaco.editor.IStandaloneCodeEditor;
  private previewPane!: HTMLDivElement;
  private mermaidPreview!: HTMLDivElement;
  private container!: HTMLDivElement;
  private editorPane!: HTMLDivElement;
  private handle!: HTMLDivElement;
  private errorOverlay!: HTMLDivElement;
  private exportButton!: HTMLButtonElement;
  private exportPngButton!: HTMLButtonElement;
  private generationStatus!: HTMLSpanElement;
  private roomId?: string;
  private client: Anthropic;

  constructor() {
    this.initializeDOM();
    this.initializeMermaid();
    this.setupEventListeners();
    this.setupCollaboration();
    this.loadInitialState();

    // Initialize Anthropic client with stored API key
    const storedApiKey =
      localStorage.getItem("anthropicApiKey") ||
      import.meta.env.VITE_ANTHROPIC_API_KEY;
    this.client = new Anthropic({
      apiKey: storedApiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  private initializeDOM(): void {
    this.initializeElements();
    this.handleEditorVisibility();
  }

  private initializeElements(): void {
    this.previewPane = document.querySelector<HTMLDivElement>("#preview-pane")!;
    this.mermaidPreview =
      document.querySelector<HTMLDivElement>("#mermaid-preview")!;
    this.container = document.querySelector(".container")!;
    this.editorPane = document.querySelector(".editor-pane")!;
    this.handle = document.querySelector(".resize-handle")!;
    this.errorOverlay = document.querySelector(".error-overlay")!;
    this.exportButton =
      document.querySelector<HTMLButtonElement>("#export-btn")!;
    this.exportButton.classList.add("button");

    this.exportPngButton =
      document.querySelector<HTMLButtonElement>("#export-png-btn")!;
    this.exportPngButton.classList.add("button");

    // Add settings button initialization
    const settingsButton =
      document.querySelector<HTMLButtonElement>("#settings-btn")!;
    settingsButton.classList.add("button");

    this.generationStatus =
      document.querySelector<HTMLSpanElement>("#generation-status")!;
  }

  private handleEditorVisibility(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const hideEditor = urlParams.has("hideEditor");

    // Always setup editor
    this.setupEditor();

    if (hideEditor) {
      this.hideEditorPane();
    }
  }

  private hideEditorPane(): void {
    const editorPane = document.querySelector<HTMLDivElement>(".editor-pane");
    const resizeHandle =
      document.querySelector<HTMLDivElement>(".resize-handle");
    if (editorPane) editorPane.style.display = "none";
    if (resizeHandle) resizeHandle.style.display = "none";
  }

  private setupEditor(): void {
    const code = this.loadDiagramFromURL();
    const editorElement =
      document.querySelector<HTMLDivElement>("#monaco-editor")!;

    this.editor = monaco.editor.create(editorElement, {
      value: code ?? "",
      language: "mermaid",
      theme: "mermaid",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    // Add resize observer to handle container size changes
    const resizeObserver = new ResizeObserver(() => {
      this.editor.layout();
    });
    resizeObserver.observe(this.editorPane);

    this.setupEditorCompletion();
  }

  private setupEditorCompletion(): void {
    monaco.editor.addEditorAction({
      id: "monacopilot.triggerCompletion",
      label: "Optimize Diagram",
      contextMenuGroupId: "navigation",
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Space,
      ],
      run: () => {},
    });
  }

  private setupCollaboration(): void {
    const urlParams = new URLSearchParams(window.location.search);
    this.roomId = urlParams.get("room") ?? undefined;

    if (!this.roomId) return;

    const client = createClient({
      publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_API_KEY,
    });

    const { room } = client.enterRoom(this.roomId);
    const yDoc = new Y.Doc();
    const yText = yDoc.getText("monaco");
    const yProvider = new LiveblocksYjsProvider(room, yDoc);
    const awareness = yProvider.awareness as unknown as Awareness;

    const userColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    const name =
      urlParams.get("name") ?? `User ${Math.floor(Math.random() * 1000)}`;

    awareness.setLocalState({ color: userColor, name });

    new MonacoBinding(
      yText,
      this.editor.getModel() as monaco.editor.ITextModel,
      new Set([this.editor]),
      awareness
    );
  }

  private initializeMermaid(): void {
    mermaid.initialize({ startOnLoad: false });

    const code = this.loadDiagramFromURL();
    if (code && code.trim().length > 0) {
      this.renderDiagram(code);
    }
  }

  private setupEventListeners(): void {
    // Only set up editor-related listeners if editor exists
    if (this.editor) {
      const debouncedUpdatePreview = this.debounce(this.updatePreview, 500);
      const debouncedGenerateDiagramHash = this.debounce(
        this.generateDiagramHash,
        500
      );
      this.editor.onDidChangeModelContent(() => {
        debouncedUpdatePreview();
        debouncedGenerateDiagramHash();
      });
      this.setupResizeListeners();

      const inputField =
        document.querySelector<HTMLTextAreaElement>("#input-field");
      const inputArea = document.querySelector<HTMLDivElement>("#input-area");

      // Check if API token exists
      const apiToken =
        localStorage.getItem("anthropicApiKey") ||
        import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiToken) {
        this.generationStatus.textContent =
          "⚠️ Please set your Anthropic API key in settings to use AI features";
        if (inputArea) inputArea.style.display = "none";
      } else {
        this.generationStatus.textContent = "";
        if (inputArea) inputArea.style.display = "block";
      }

      if (inputField) {
        inputField.addEventListener("keydown", async (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            await this.handleSubmit();
          }
        });
      }
    }

    this.setupPanZoomListeners();
    this.exportButton.addEventListener("click", () => this.exportToSvg());
    this.exportPngButton.addEventListener("click", () => this.exportToPng());

    // Add settings dialog listeners
    const settingsBtn =
      document.querySelector<HTMLButtonElement>("#settings-btn")!;
    const settingsDialog =
      document.querySelector<HTMLDivElement>("#settings-dialog")!;
    const saveSettingsBtn =
      document.querySelector<HTMLButtonElement>("#save-settings")!;
    const apiTokenInput =
      document.querySelector<HTMLInputElement>("#api-token")!;

    // Load saved API token
    apiTokenInput.value = localStorage.getItem("anthropicApiKey") || "";

    settingsBtn.addEventListener("click", () => {
      settingsDialog.classList.toggle("hidden");
    });

    saveSettingsBtn.addEventListener("click", () => {
      const apiToken = apiTokenInput.value.trim();
      const inputArea = document.querySelector<HTMLDivElement>("#input-area");
      const inputField =
        document.querySelector<HTMLTextAreaElement>("#input-field");

      if (apiToken) {
        localStorage.setItem("anthropicApiKey", apiToken);
        this.client = new Anthropic({
          apiKey: apiToken,
          dangerouslyAllowBrowser: true,
        });
        // Show input area and clear status when API key is set
        if (inputArea) {
          inputArea.style.display = "block";
          if (inputField) inputField.style.display = "block";
        }
        this.generationStatus.textContent = "";
      } else {
        // Hide input area and show status when no API key
        if (inputArea) {
          inputArea.style.display = "none";
          if (inputField) inputField.style.display = "none";
        }
        this.generationStatus.textContent =
          "⚠️ Please set your Anthropic API key in settings to use AI features";
      }
      settingsDialog.classList.add("hidden");
    });

    // Close dialog when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !settingsDialog.contains(e.target as Node) &&
        !settingsBtn.contains(e.target as Node) &&
        !settingsDialog.classList.contains("hidden")
      ) {
        settingsDialog.classList.add("hidden");
      }
    });
  }

  private generateDiagramHash(): void {
    const code = this.editor.getValue();
    if (code.trim().length > 0) {
      const compressedCode = LZString.compressToEncodedURIComponent(code);
      window.history.replaceState(null, "", `#${compressedCode}`);
    } else {
      window.history.replaceState(null, "", "");
    }
  }

  private async renderMermaidDiagram(code: string): Promise<void> {
    try {
      this.mermaidPreview.innerHTML = "";

      // Validate syntax
      if (!(await mermaid.parse(code))) {
        throw new Error("Invalid diagram syntax");
      }

      // Render diagram
      const result = await mermaid.render("mermaid-diagram", code);
      this.mermaidPreview.innerHTML = result.svg;
      this.hideError();

      // Auto-fit if diagram is in initial position
      const isInitialPosition =
        state.scale === 1 && state.translateX === 0 && state.translateY === 0;
      if (isInitialPosition) {
        this.autoFitPreview();
      }
    } catch (error) {
      console.error("Failed to render diagram:", error);
      this.showError(
        error instanceof Error ? error.message : "Failed to render diagram"
      );
    }
  }

  private updatePreview = async (): Promise<void> => {
    const code = this.editor.getValue();
    if (code.trim().length > 0) {
      await this.renderMermaidDiagram(code);
    } else {
      this.mermaidPreview.innerHTML = "";
    }
  };

  private async renderDiagram(code: string): Promise<void> {
    await this.renderMermaidDiagram(code);
  }

  private autoFitPreview(): void {
    // Get the SVG element
    const svg = this.mermaidPreview.querySelector("svg");
    if (!svg) return;

    // Get dimensions
    const svgRect = svg.getBoundingClientRect();
    const previewPaneRect = this.previewPane.getBoundingClientRect();

    // Calculate scale to fit
    const scaleX = previewPaneRect.width / svgRect.width;
    const scaleY = previewPaneRect.height / svgRect.height;
    const scale = Math.min(scaleX, scaleY, CONFIG.maxScale) * 0.9; // 90% of available space

    // Calculate center position
    state.scale = scale;
    state.translateX = (previewPaneRect.width - svgRect.width * scale) / 2;
    state.translateY = (previewPaneRect.height - svgRect.height * scale) / 2;
    state.zoomTranslateX = 0;
    state.zoomTranslateY = 0;

    this.updateTransform();
  }

  private loadDiagramFromURL(): string | null {
    const hash = window.location.hash;
    if (!hash) {
      return null;
    }

    const compressedCode = hash.slice(1);
    return LZString.decompressFromEncodedURIComponent(compressedCode);
  }

  private setupResizeListeners(): void {
    const handleMouseUp = () => {
      state.isResizing = false;
      document.removeEventListener("mousemove", this.handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // Save width to localStorage
      localStorage.setItem("editorWidth", this.editorPane.style.flexBasis);
    };

    this.handle.addEventListener("mousedown", (_e: MouseEvent) => {
      state.isResizing = true;
      document.addEventListener("mousemove", this.handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    });
  }

  private setupPanZoomListeners(): void {
    this.mermaidPreview.addEventListener("wheel", this.handleZoom);
    this.mermaidPreview.addEventListener("mousedown", this.handleDragStart);
    document.addEventListener("mousemove", this.handleDragMove);
    document.addEventListener("mouseup", this.handleDragEnd);
  }

  private handleZoom = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = this.mermaidPreview.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? -CONFIG.zoomFactor : CONFIG.zoomFactor;
    const newScale = Math.min(
      Math.max(state.scale * (1 + delta), CONFIG.minScale),
      CONFIG.maxScale
    );

    // Calculate the position difference caused by scaling
    const dx = mouseX - mouseX * (newScale / state.scale);
    const dy = mouseY - mouseY * (newScale / state.scale);

    // Update the translation to keep the point under the mouse fixed
    state.translateX += dx;
    state.translateY += dy;
    state.scale = newScale;

    this.updateTransform();
  };

  private handleDragStart = (e: MouseEvent): void => {
    state.isDragging = true;
    state.startX = e.clientX - state.translateX;
    state.startY = e.clientY - state.translateY;
  };

  private handleDragMove = (e: MouseEvent): void => {
    if (!state.isDragging) return;
    state.translateX = e.clientX - state.startX;
    state.translateY = e.clientY - state.startY;
    this.updateTransform();
  };

  private handleDragEnd = (): void => {
    state.isDragging = false;
  };

  private updateTransform(): void {
    // Combine both transforms
    const totalTranslateX = state.translateX + state.zoomTranslateX;
    const totalTranslateY = state.translateY + state.zoomTranslateY;

    this.mermaidPreview.style.transformOrigin = "0 0";
    this.mermaidPreview.style.transform = `translate(${totalTranslateX}px, ${totalTranslateY}px) scale(${state.scale})`;
  }

  private loadInitialState(): void {
    const hash = window.location.hash;
    if (!hash) return;

    this.loadSavedEditorWidth();
  }

  private loadSavedEditorWidth(): void {
    const savedWidth = localStorage.getItem("editorWidth");
    if (savedWidth) {
      this.editorPane.style.flexBasis = savedWidth;
    }
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (!state.isResizing) return;
    const containerWidth = this.container.clientWidth;
    const newWidth = (e.clientX / containerWidth) * 100;
    const clampedWidth = Math.max(newWidth, CONFIG.minWidth);
    this.editorPane.style.flexBasis = `${clampedWidth}%`;
  };

  private showError(message: string): void {
    this.errorOverlay.textContent = message;
    this.errorOverlay.style.display = "flex";
  }

  private hideError(): void {
    this.errorOverlay.style.display = "none";
  }

  // Add debounce utility method
  private debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  private exportToSvg(): void {
    // Get the SVG element
    const svg = this.mermaidPreview.querySelector("svg");
    if (!svg) return;

    // Get SVG content
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement("a");
    a.href = url;
    a.download = "mermaid-diagram.svg";
    a.click();

    // Cleanup
    URL.revokeObjectURL(url);
  }

  private exportToPng(): void {
    const svg = this.mermaidPreview.querySelector("svg");
    if (!svg) return;

    // Get the actual SVG dimensions from viewBox or width/height attributes
    const viewBox = svg.getAttribute("viewBox")?.split(" ").map(Number);
    const svgWidth = viewBox
      ? viewBox[2]
      : parseFloat(svg.getAttribute("width") || "0");
    const svgHeight = viewBox
      ? viewBox[3]
      : parseFloat(svg.getAttribute("height") || "0");

    // Calculate scale to ensure minimum dimension of 1000px
    const minDimension = 1000;
    const scaleX = minDimension / svgWidth;
    const scaleY = minDimension / svgHeight;
    const scale = Math.max(scaleX, scaleY);

    // Set canvas dimensions
    const canvas = document.createElement("canvas");
    canvas.width = svgWidth * scale;
    canvas.height = svgHeight * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale the context
    ctx.scale(scale, scale);

    // Get SVG data and encode it
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    // Create image and draw to canvas
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(img, 0, 0);

      // Convert to PNG and download
      try {
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = "mermaid-diagram.png";
        a.click();
      } catch (error) {
        console.error("Error exporting PNG:", error);
      }
    };
    img.src = dataUrl;
  }

  private async handleSubmit(): Promise<void> {
    const inputField =
      document.querySelector<HTMLTextAreaElement>("#input-field");
    if (!inputField) return;

    let prompt = inputField.value.trim();
    if (!prompt) return;

    try {
      this.editor.updateOptions({ readOnly: true });
      inputField.disabled = true;
      this.generationStatus.textContent = "AI is generating...";

      const currentCode = this.editor.getValue();

      if (currentCode) {
        prompt = `Given this Mermaid diagram:\n\n${currentCode}\n\n${prompt}`;
      }

      const stream = await this.client.messages.create({
        max_tokens: 8192,
        system:
          "You are a helpful assistant that can help me go create or edit the Mermaid diagram code. wrap the code in ```mermaid tags. Think step by step before responding.",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.3,
        stream: true,
      });

      let isInsideCodeBlock = false;
      let accumulatedCode = "";
      let tempResponse = "";

      for await (const messageStreamEvent of stream) {
        if (messageStreamEvent.type === "content_block_delta") {
          const chunk =
            "text" in messageStreamEvent.delta
              ? messageStreamEvent.delta.text
              : "";
          tempResponse += chunk;
          // start of code block
          const mermaidMatch = tempResponse.match(/```mermaid\n([\s\S]*?)```/);
          if (mermaidMatch) {
            isInsideCodeBlock = true;
            accumulatedCode = mermaidMatch[1].trim();
            this.editor.setValue(accumulatedCode);
            continue;
          }

          // end of code block
          if (tempResponse.includes("```") && isInsideCodeBlock) {
            isInsideCodeBlock = false;
            accumulatedCode += tempResponse.replace("```", "");
            this.editor.setValue(accumulatedCode);
            break;
          }

          // inside code block
          if (isInsideCodeBlock) {
            accumulatedCode += chunk;
            this.editor.setValue(accumulatedCode);
          }
        }
      }

      inputField.value = "";
    } catch (error) {
      console.error("Error processing prompt:", error);
      this.generationStatus.textContent =
        "❌ Failed to process prompt with AI. Check your API key";
      setTimeout(() => {
        this.generationStatus.textContent = "";
      }, 5000); // Clear error after 5 seconds
    } finally {
      inputField.disabled = false;
      this.generationStatus.textContent = "";
      this.editor.updateOptions({ readOnly: false });
    }
  }
}

// Initialize the editor
new MermaidEditor();
