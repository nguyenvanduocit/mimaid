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
      generationStatus: document.querySelector<HTMLSpanElement>("#generation-status")!
    };

    this.elements.exportButton.classList.add("button");
    this.elements.exportPngButton.classList.add("button");

    const settingsButton = document.querySelector<HTMLButtonElement>("#settings-btn")!;
    settingsButton.classList.add("button");
    this.elements.generationStatus.style.display = "none";
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

  private setupEditor(): void {
    const code = loadDiagramFromURL();
    const editorElement = document.querySelector<HTMLDivElement>("#monaco-editor")!;

    this.editor = monaco.editor.create(editorElement, {
      value: code ?? "",
      ...MONACO_CONFIG
    });

    const resizeObserver = new ResizeObserver(() => {
      this.editor.layout();
    });
    resizeObserver.observe(this.elements.editorPane);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    const inputField = document.querySelector<HTMLTextAreaElement>("#input-field")!;
    const inputArea = document.querySelector<HTMLDivElement>("#input-area")!;

    this.aiHandler = new AIHandler(this.editor, {
      inputField,
      inputArea,
      generationStatus: this.elements.generationStatus
    });

    this.collaborationHandler = new CollaborationHandler(this.editor);
    this.collaborationHandler.setup();
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
      const debouncedUpdatePreview = debounce(this.updatePreview.bind(this), 500);
      const debouncedGenerateDiagramHash = debounce((code: string) => generateDiagramHash(code), 500);
      
      this.editor.onDidChangeModelContent(() => {
        debouncedUpdatePreview();
        debouncedGenerateDiagramHash(this.editor.getValue());
      });
      
      this.setupResizeListeners();
      this.setupInputListeners();
    }

    this.setupPanZoomListeners();
    this.elements.exportButton.addEventListener("click", () => this.exportToSvg());
    this.elements.exportPngButton.addEventListener("click", () => this.exportToPng());
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

      const result = await mermaid.render("mermaid-diagram", code);
      this.elements.mermaidPreview.innerHTML = result.svg;
      this.hideError();

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

  private exportToPng(): void {
    const svg = this.elements.mermaidPreview.querySelector("svg");
    if (!svg) return;

    const viewBox = svg.getAttribute("viewBox")?.split(" ").map(Number);
    const svgWidth = viewBox
      ? viewBox[2]
      : parseFloat(svg.getAttribute("width") || "0");
    const svgHeight = viewBox
      ? viewBox[3]
      : parseFloat(svg.getAttribute("height") || "0");

    const minDimension = 1000;
    const scaleX = minDimension / svgWidth;
    const scaleY = minDimension / svgHeight;
    const scale = Math.max(scaleX, scaleY);

    const canvas = document.createElement("canvas");
    canvas.width = svgWidth * scale;
    canvas.height = svgHeight * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(scale, scale);

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(img, 0, 0);

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
