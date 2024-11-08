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

// Call the configuration function before creating the editor
configureMermaidLanguage();

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="container">
    <div class="editor-pane">
      <div id="monaco-editor" class="editor"></div>
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
  private roomId?: string;
  constructor() {
    this.initializeDOM();
    this.initializeMermaid();
    this.setupEventListeners();
    this.loadInitialState();
  }

  private initializeDOM(): void {
    // Get room from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);

    // Initialize Monaco editor (moved outside the if block)
    const editorElement =
      document.querySelector<HTMLDivElement>("#monaco-editor")!;
    this.editor = monaco.editor.create(editorElement, {
      value: ``,
      language: "mermaid",
      theme: "mermaid",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    this.roomId = urlParams.get("room") ?? undefined;

    // Only set up Liveblocks if room parameter exists
    if (this.roomId) {
      const client = createClient({
        publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_API_KEY,
      });

      const { room } = client.enterRoom(this.roomId);
      const yDoc = new Y.Doc();
      const yText = yDoc.getText("monaco");
      const yProvider = new LiveblocksYjsProvider(room, yDoc);
      const awareness = yProvider.awareness as unknown as Awareness;
      debugger;
      const userColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

      const name =
        urlParams.get("name") ?? `User ${Math.floor(Math.random() * 1000)}`;
      awareness.setLocalState({
        color: userColor,
        name,
      });

      new MonacoBinding(
        yText,
        this.editor.getModel() as monaco.editor.ITextModel,
        new Set([this.editor]),
        awareness
      );
    }

    this.previewPane = document.querySelector<HTMLDivElement>("#preview-pane")!;
    this.mermaidPreview =
      document.querySelector<HTMLDivElement>("#mermaid-preview")!;
    this.container = document.querySelector(".container")!;
    this.editorPane = document.querySelector(".editor-pane")!;
    this.handle = document.querySelector(".resize-handle")!;
    this.errorOverlay = document.querySelector(".error-overlay")!;
    this.exportButton =
      document.querySelector<HTMLButtonElement>("#export-btn")!;
    this.exportPngButton =
      document.querySelector<HTMLButtonElement>("#export-png-btn")!;
  }

  private initializeMermaid(): void {
    mermaid.initialize({ startOnLoad: false });
  }

  private setupEventListeners(): void {
    // Replace textarea input listener with Monaco change listener
    const debouncedUpdatePreview = this.debounce(this.updatePreview, 500);
    this.editor.onDidChangeModelContent(() => {
      debouncedUpdatePreview();
    });
    this.setupResizeListeners();
    this.setupPanZoomListeners();
    this.exportButton.addEventListener("click", () => this.exportToSvg());
    this.exportPngButton.addEventListener("click", () => this.exportToPng());
  }

  private updatePreview = async (): Promise<void> => {
    try {
      // Get value from Monaco instead of textarea
      const code = this.editor.getValue();
      this.mermaidPreview.innerHTML = "";
      // Validate syntax first
      if (!(await mermaid.parse(code))) {
        throw new Error("Invalid diagram syntax");
      }

      const compressedCode = LZString.compressToEncodedURIComponent(code);
      window.history.replaceState(null, "", `#${compressedCode}`);

      const result = await mermaid.render("mermaid-diagram", code);
      this.mermaidPreview.innerHTML = result.svg;
      this.hideError();

      // Auto-fit on first render
      if (
        state.scale === 1 &&
        state.translateX === 0 &&
        state.translateY === 0
      ) {
        this.autoFitPreview();
      }
    } catch (error) {
      console.error("Failed to update preview:", error);
      this.showError(
        error instanceof Error ? error.message : "Failed to render diagram"
      );
    }
  };

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

  private loadDiagramFromURL(): void {
    const hash = window.location.hash;
    if (!hash) {
      return;
    }

    try {
      const compressedCode = hash.slice(1);
      const code = LZString.decompressFromEncodedURIComponent(compressedCode);
      if (code) {
        this.editor.setValue(code);
      }
    } catch (error) {
      console.error("Failed to decompress diagram from URL:", error);
    }
  }

  private setupResizeListeners(): void {
    this.handle.addEventListener("mousedown", (_e: MouseEvent) => {
      state.isResizing = true;
      document.addEventListener("mousemove", this.handleMouseMove);
      document.addEventListener("mouseup", () => {
        state.isResizing = false;
        document.removeEventListener("mousemove", this.handleMouseMove);
        // Save width to localStorage
        localStorage.setItem("editorWidth", this.editorPane.style.flexBasis);
      });
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
    if (!this.roomId) {
      this.loadDiagramFromURL();
    }
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
    let timeout: number | undefined;
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
}

// Initialize the editor
new MermaidEditor();
