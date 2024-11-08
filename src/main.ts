import mermaid from "mermaid";
import "./modern-normalize.css";
import "./style.css";
import LZString from "lz-string";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="container">
    <div class="editor-pane">
      <textarea id="mermaid-editor" class="editor">graph TD
    A[Start] --> B[Process]
    B --> C[End]</textarea>
    </div>
    <div class="resize-handle"></div>
    <div class="preview-pane">
      <div id="mermaid-preview"></div>
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
}

interface EditorConfig {
  minScale: number;
  maxScale: number;
  minWidth: number;
  maxWidth: number;
  zoomFactor: number;
}

// Configuration object
const CONFIG: EditorConfig = {
  minScale: 0.5,
  maxScale: 3,
  minWidth: 20, // percentage
  maxWidth: 80, // percentage
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
};

class MermaidEditor {
  private editor!: HTMLTextAreaElement;
  private preview!: HTMLDivElement;
  private mermaidPreview!: HTMLDivElement;
  private container!: HTMLDivElement;
  private editorPane!: HTMLDivElement;
  private handle!: HTMLDivElement;
  private errorOverlay!: HTMLDivElement;

  constructor() {
    this.initializeDOM();
    this.initializeMermaid();
    this.setupEventListeners();
    this.loadInitialState();
  }

  private initializeDOM(): void {
    this.editor =
      document.querySelector<HTMLTextAreaElement>("#mermaid-editor")!;
    this.preview = document.querySelector<HTMLDivElement>("#mermaid-preview")!;
    this.mermaidPreview = this.preview;
    this.container = document.querySelector(".container")!;
    this.editorPane = document.querySelector(".editor-pane")!;
    this.handle = document.querySelector(".resize-handle")!;

    // Create and append error overlay
    this.errorOverlay = document.createElement("div");
    this.errorOverlay.className = "error-overlay";
    this.errorOverlay.style.display = "none";
    this.preview.appendChild(this.errorOverlay);
  }

  private initializeMermaid(): void {
    mermaid.initialize({ startOnLoad: false });
  }

  private setupEventListeners(): void {
    this.editor.addEventListener("input", () => this.updatePreview());
    this.setupResizeListeners();
    this.setupPanZoomListeners();
  }

  private updatePreview = async (): Promise<void> => {
    try {
      const code = this.editor.value;
      this.preview.innerHTML = "";

      // Create and append error overlay again since we cleared the preview
      this.errorOverlay = document.createElement("div");
      this.errorOverlay.className = "error-overlay";
      this.preview.appendChild(this.errorOverlay);

      // Validate syntax first
      if (!(await mermaid.parse(code))) {
        throw new Error("Invalid diagram syntax");
      }

      const compressedCode = LZString.compressToEncodedURIComponent(code);
      window.history.replaceState(null, "", `#${compressedCode}`);

      const result = await mermaid.render("mermaid-diagram", code);
      this.preview.innerHTML = result.svg;
      this.hideError();
    } catch (error) {
      console.error("Failed to update preview:", error);
      this.showError(
        error instanceof Error ? error.message : "Failed to render diagram"
      );
    }
  };

  private loadDiagramFromURL(): void {
    const hash = window.location.hash;
    if (hash) {
      try {
        const compressedCode = hash.slice(1); // Remove the # symbol
        const code = LZString.decompressFromEncodedURIComponent(compressedCode);
        if (code) {
          this.editor.value = code;
          this.updatePreview();
        }
      } catch (error) {
        console.error("Failed to decompress diagram from URL:", error);
      }
    }
  }

  private setupResizeListeners(): void {
    this.handle.addEventListener("mousedown", (e) => {
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
    this.preview.addEventListener("wheel", this.handleZoom);
    this.preview.addEventListener("mousedown", this.handleDragStart);
    document.addEventListener("mousemove", this.handleDragMove);
    document.addEventListener("mouseup", this.handleDragEnd);
  }

  private handleZoom = (e: WheelEvent): void => {
    e.preventDefault();
    // Get mouse position relative to the preview
    const rect = this.preview.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate new scale
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(
      Math.max(state.scale * delta, CONFIG.minScale),
      CONFIG.maxScale
    );

    // Adjust translation to zoom towards mouse position
    state.translateX += mouseX * (1 - delta);
    state.translateY += mouseY * (1 - delta);

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
    this.mermaidPreview.style.transformOrigin = "0 0";
    this.mermaidPreview.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`;
  }

  private loadInitialState(): void {
    this.loadSavedEditorWidth();
    this.loadDiagramFromURL();
    if (!window.location.hash) {
      this.updatePreview();
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
    const clampedWidth = Math.min(
      Math.max(newWidth, CONFIG.minWidth),
      CONFIG.maxWidth
    );
    this.editorPane.style.flexBasis = `${clampedWidth}%`;
  };

  private showError(message: string): void {
    this.errorOverlay.textContent = message;
    this.errorOverlay.style.display = "flex";
  }

  private hideError(): void {
    this.errorOverlay.style.display = "none";
  }
}

// Initialize the editor
new MermaidEditor();
