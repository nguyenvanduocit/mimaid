import mermaid from "mermaid";
import "./modern-normalize.css";
import "./style.css";
import * as monaco from "monaco-editor";
import { configureMermaidLanguage } from "./configMermaidLanguage";
import { EditorState, EditorElements } from "./types";
import { EDITOR_CONFIG, MONACO_CONFIG, MERMAID_CONFIG } from "./config";
import { AIHandler } from "./ai-handler";
import { CollaborationHandler } from "./collaboration";
import { debounce, loadDiagramFromURL, generateDiagramHash, getStoredEditorWidth, setStoredEditorWidth } from "./utils";

// Lazy load Monaco editor
let monacoInstance: typeof monaco | null = null;
async function loadMonaco() {
  if (!monacoInstance) {
    const monaco = await import("monaco-editor");
    monacoInstance = monaco;
    return monaco;
  }
  return monacoInstance;
}

// Call the configuration function before creating the editor
configureMermaidLanguage();

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
  private elements!: EditorElements;
  private aiHandler!: AIHandler;
  private collaborationHandler!: CollaborationHandler;

  constructor() {
    this.initializeDOM();
    this.initializeMermaid();
    this.setupEventListeners();
    this.loadInitialState();
  }

  private initializeDOM(): void {
    this.initializeElements();
    this.handleEditorVisibility();
  }

  private initializeElements(): void {
    this.elements = {
      previewPane: document.querySelector<HTMLDivElement>("#preview-pane")!,
      mermaidPreview: document.querySelector<HTMLDivElement>("#mermaid-preview")!,
      container: document.querySelector(".container")!,
      editorPane: document.querySelector(".editor-pane")!,
      handle: document.querySelector(".resize-handle")!,
      errorOverlay: document.querySelector(".error-overlay")!,
      exportButton: document.querySelector<HTMLButtonElement>("#export-btn")!,
      exportPngButton: document.querySelector<HTMLButtonElement>("#export-png-btn")!,
      zoomInButton: document.querySelector<HTMLButtonElement>("#zoom-in-btn")!,
      zoomOutButton: document.querySelector<HTMLButtonElement>("#zoom-out-btn")!,
      generationStatus: document.querySelector<HTMLSpanElement>("#generation-status")!
    };

    this.elements.generationStatus = document.querySelector<HTMLSpanElement>("#generation-status")!;
    this.elements.generationStatus.style.display = "none";

    const settingsButton = document.querySelector<HTMLButtonElement>("#settings-btn")!;
    settingsButton.classList.add("button");
  }

  private handleEditorVisibility(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const hideEditor = urlParams.has("hideEditor");

    this.setupEditor();

    if (hideEditor) {
      this.hideEditorPane();
    }
  }

  private hideEditorPane(): void {
    this.elements.editorPane.style.display = "none";
    this.elements.handle.style.display = "none";
  }

  private async setupEditor(): Promise<void> {
    const code = loadDiagramFromURL() || "";
    const editorElement = document.querySelector<HTMLDivElement>("#monaco-editor");
    
    if (!editorElement) return;

    const monaco = await loadMonaco();
    this.editor = monaco.editor.create(editorElement, {
      value: code,
      ...MONACO_CONFIG
    });

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        this.editor.layout();
      });
    });
    resizeObserver.observe(this.elements.editorPane);

    this.setupHandlers();
  }

  private async setupHandlers(): Promise<void> {
    const inputField = document.querySelector<HTMLTextAreaElement>("#input-field")!;
    const inputArea = document.querySelector<HTMLDivElement>("#input-area")!;

    this.aiHandler = new AIHandler(this.editor, {
      inputField,
      inputArea,
      generationStatus: this.elements.generationStatus
    });

    // Lazy load collaboration handler
    if (window.location.search.includes('room')) {
      const { CollaborationHandler } = await import('./collaboration');
      this.collaborationHandler = new CollaborationHandler(this.editor);
      await this.collaborationHandler.setup();
    }
  }

  private initializeMermaid(): void {
    mermaid.initialize(MERMAID_CONFIG);

    const code = loadDiagramFromURL();
    if (code?.trim().length > 0) {
      this.renderDiagram(code);
    }
  }

  private setupEventListeners(): void {
    if (this.editor) {
      const debouncedUpdatePreview = debounce(this.updatePreview.bind(this), 250);
      const debouncedGenerateDiagramHash = debounce((code: string) => generateDiagramHash(code), 250);
      
      this.editor.onDidChangeModelContent(() => {
        requestAnimationFrame(() => {
          debouncedUpdatePreview();
          debouncedGenerateDiagramHash(this.editor.getValue());
        });
      });
      
      this.setupResizeListeners();
      this.setupInputListeners();
    }

    this.setupPanZoomListeners();
    this.elements.exportButton.addEventListener("click", () => this.exportToSvg());
    this.elements.exportPngButton.addEventListener("click", () => this.exportToPng());
    this.elements.zoomInButton.addEventListener("click", () => this.handleZoomButtonClick(EDITOR_CONFIG.zoomFactor));
    this.elements.zoomOutButton.addEventListener("click", () => this.handleZoomButtonClick(-EDITOR_CONFIG.zoomFactor));
    this.setupSettingsListeners();
  }

  private setupInputListeners(): void {
    const inputField = document.querySelector<HTMLTextAreaElement>("#input-field");
    if (inputField) {
      inputField.addEventListener("keydown", async (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          await this.aiHandler.handleSubmit();
        }
      });
    }
  }

  private setupSettingsListeners(): void {
    const settingsBtn = document.querySelector<HTMLButtonElement>("#settings-btn")!;
    const settingsDialog = document.querySelector<HTMLDivElement>("#settings-dialog")!;
    const saveSettingsBtn = document.querySelector<HTMLButtonElement>("#save-settings")!;
    const apiTokenInput = document.querySelector<HTMLInputElement>("#api-token")!;

    apiTokenInput.value = localStorage.getItem("anthropicApiKey") || "";

    settingsBtn.addEventListener("click", () => {
      settingsDialog.classList.toggle("hidden");
    });

    saveSettingsBtn.addEventListener("click", () => {
      const apiToken = apiTokenInput.value.trim();
      localStorage.setItem("anthropicApiKey", apiToken);
      settingsDialog.classList.add("hidden");
    });

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

  private setupResizeListeners(): void {
    const handleMouseUp = () => {
      state.isResizing = false;
      document.removeEventListener("mousemove", this.handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      setStoredEditorWidth(this.elements.editorPane.style.flexBasis);
    };

    this.elements.handle.addEventListener("mousedown", () => {
      state.isResizing = true;
      document.addEventListener("mousemove", this.handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    });
  }

  private setupPanZoomListeners(): void {
    this.elements.mermaidPreview.addEventListener("wheel", this.handleZoom);
    this.elements.mermaidPreview.addEventListener("mousedown", this.handleDragStart);
    document.addEventListener("mousemove", this.handleDragMove);
    document.addEventListener("mouseup", this.handleDragEnd);
  }

  private handleZoom = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = this.elements.mermaidPreview.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? -EDITOR_CONFIG.zoomFactor : EDITOR_CONFIG.zoomFactor;
    const newScale = Math.min(
      Math.max(state.scale * (1 + delta), EDITOR_CONFIG.minScale),
      EDITOR_CONFIG.maxScale
    );

    const dx = mouseX - mouseX * (newScale / state.scale);
    const dy = mouseY - mouseY * (newScale / state.scale);

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

  private handleMouseMove = (e: MouseEvent): void => {
    if (!state.isResizing) return;
    const containerWidth = this.elements.container.clientWidth;
    const newWidth = (e.clientX / containerWidth) * 100;
    const clampedWidth = Math.max(newWidth, EDITOR_CONFIG.minWidth);
    this.elements.editorPane.style.flexBasis = `${clampedWidth}%`;
  };

  private updateTransform(): void {
    const totalTranslateX = state.translateX + state.zoomTranslateX;
    const totalTranslateY = state.translateY + state.zoomTranslateY;

    this.elements.mermaidPreview.style.transformOrigin = "0 0";
    this.elements.mermaidPreview.style.transform = `translate(${totalTranslateX}px, ${totalTranslateY}px) scale(${state.scale})`;
  }

  private async renderMermaidDiagram(code: string): Promise<void> {
    try {
      this.elements.mermaidPreview.innerHTML = "";

      if (!(await mermaid.parse(code))) {
        throw new Error("Invalid diagram syntax");
      }

      // Create a temporary div for rendering
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.visibility = 'hidden';
      document.body.appendChild(tempDiv);
      
      const result = await mermaid.render("mermaid-diagram", code, tempDiv);
      
      // Use requestAnimationFrame for DOM updates
      requestAnimationFrame(() => {
        this.elements.mermaidPreview.innerHTML = result.svg;
        this.hideError();

        const isInitialPosition =
          state.scale === 1 && state.translateX === 0 && state.translateY === 0;
        if (isInitialPosition) {
          this.autoFitPreview();
        }
        
        // Clean up
        document.body.removeChild(tempDiv);
      });
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
      this.elements.mermaidPreview.innerHTML = "";
    }
  };

  private async renderDiagram(code: string): Promise<void> {
    await this.renderMermaidDiagram(code);
  }

  private autoFitPreview(): void {
    const svg = this.elements.mermaidPreview.querySelector("svg");
    if (!svg) return;

    const svgRect = svg.getBoundingClientRect();
    const previewPaneRect = this.elements.previewPane.getBoundingClientRect();

    const scaleX = previewPaneRect.width / svgRect.width;
    const scaleY = previewPaneRect.height / svgRect.height;
    const scale = Math.min(scaleX, scaleY, EDITOR_CONFIG.maxScale) * 0.9;

    state.scale = scale;
    state.translateX = (previewPaneRect.width - svgRect.width * scale) / 2;
    state.translateY = (previewPaneRect.height - svgRect.height * scale) / 2;
    state.zoomTranslateX = 0;
    state.zoomTranslateY = 0;

    this.updateTransform();
  }

  private loadInitialState(): void {
    const savedWidth = getStoredEditorWidth();
    if (savedWidth) {
      this.elements.editorPane.style.flexBasis = savedWidth;
    }
  }

  private showError(message: string): void {
    this.elements.errorOverlay.textContent = message;
    this.elements.errorOverlay.style.display = "flex";
  }

  private hideError(): void {
    this.elements.errorOverlay.style.display = "none";
  }

  private exportToSvg(): void {
    const svg = this.elements.mermaidPreview.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "mermaid-diagram.svg";
    a.click();

    URL.revokeObjectURL(url);
  }

  private async exportToPng(): Promise<void> {
    const svg = this.elements.mermaidPreview.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    // Create blob URL for better memory management
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size based on SVG viewBox
      const viewBox = svg.getAttribute("viewBox")?.split(" ").map(Number);
      canvas.width = viewBox ? viewBox[2] : parseFloat(svg.getAttribute("width") || "800");
      canvas.height = viewBox ? viewBox[3] : parseFloat(svg.getAttribute("height") || "600");

      // Use high-quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw image and export
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngUrl = canvas.toDataURL("image/png");
      
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = "mermaid-diagram.png";
      a.click();
    } catch (error) {
      console.error("Error exporting PNG:", error);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private handleZoomButtonClick = (delta: number): void => {
    const newScale = Math.min(
      Math.max(state.scale * (1 + delta), EDITOR_CONFIG.minScale),
      EDITOR_CONFIG.maxScale
    );

    // Calculate zoom from center of preview
    const rect = this.elements.mermaidPreview.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const dx = centerX - centerX * (newScale / state.scale);
    const dy = centerY - centerY * (newScale / state.scale);

    state.translateX += dx;
    state.translateY += dy;
    state.scale = newScale;

    this.updateTransform();
  };
}

// Initialize the editor
new MermaidEditor();
