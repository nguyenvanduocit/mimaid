import mermaid from "mermaid";
import svgPanZoom from "svg-pan-zoom";
import "./modern-normalize.css";
import "./style.css";
import { EditorState, EditorElements } from "./types";
import { EDITOR_CONFIG, MONACO_CONFIG, MERMAID_CONFIG } from "./config";
import { AIHandler } from "./ai-handler";
import { CollaborationHandler } from "./collaboration";
import { debounce, loadDiagramFromURL, generateDiagramHash, getStoredEditorWidth, setStoredEditorWidth } from "./utils";
//import "./debug";

// Lazy load Monaco editor
let monacoInstance: any | null = null;
async function loadMonaco() {
  if (!monacoInstance) {
    const monaco = await import("monaco-editor");
    monacoInstance = monaco;
    
    // Configure Mermaid language after Monaco is loaded
    const { configureMermaidLanguage } = await import("./configMermaidLanguage");
    configureMermaidLanguage(monaco);
    
    return monaco;
  }
  return monacoInstance;
}

// State management
const state: EditorState = {
  isResizing: false,
};

class MermaidEditor {
  private editor!: any; // Change type to any since we're dynamically importing
  private elements!: EditorElements;
  private aiHandler!: AIHandler;
  private collaborationHandler!: CollaborationHandler;
  private panZoomInstance: any;

  constructor() {
    this.initializeDOM();
    this.initializeMermaid();
    this.setupEventListeners();
    this.loadInitialState();
    this.updateInputAreaVisibility();
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

    // Set up editor-specific event listeners after editor is created
    this.setupEditorEventListeners();

    this.setupHandlers();
  }

  private async setupHandlers(): Promise<void> {
    const inputField = document.querySelector<HTMLTextAreaElement>("#input-field")!;
    const inputArea = document.querySelector<HTMLDivElement>("#input-area")!;

    // Only initialize AI handler if API key is available
    const apiKey = localStorage.getItem("googleAiApiKey") || "";
    if (apiKey && apiKey.trim().length > 0) {
      this.aiHandler = new AIHandler(this.editor, {
        inputField,
        inputArea,
        generationStatus: this.elements.generationStatus
      });
    }

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
    if (code && code.trim().length > 0) {
      this.renderDiagram(code);
    }
  }

  private setupEditorEventListeners(): void {
    const debouncedUpdatePreview = debounce(this.updatePreview.bind(this), 250);
    const debouncedGenerateDiagramHash = debounce((code: string) => generateDiagramHash(code), 250);
    
    this.editor.onDidChangeModelContent(() => {
      requestAnimationFrame(() => {
        debouncedUpdatePreview();
        debouncedGenerateDiagramHash(this.editor.getValue());
      });
    });
  }

  private setupEventListeners(): void {
    this.setupResizeListeners();
    this.setupInputListeners();

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
          if (this.aiHandler) {
            await this.aiHandler.handleSubmit();
          }
        }
      });
    }
  }

  private setupSettingsListeners(): void {
    const settingsBtn = document.querySelector<HTMLButtonElement>("#settings-btn")!;
    const settingsDialog = document.querySelector<HTMLDivElement>("#settings-dialog")!;
    const saveSettingsBtn = document.querySelector<HTMLButtonElement>("#save-settings")!;
    const apiTokenInput = document.querySelector<HTMLInputElement>("#api-token")!;

    apiTokenInput.value = localStorage.getItem("googleAiApiKey") || "";

    settingsBtn.addEventListener("click", () => {
      settingsDialog.classList.toggle("hidden");
      if (!settingsDialog.classList.contains("hidden")) {
        apiTokenInput.focus();
      }
    });

    saveSettingsBtn.addEventListener("click", () => {
      const apiToken = apiTokenInput.value.trim();
      localStorage.setItem("googleAiApiKey", apiToken);
      settingsDialog.classList.add("hidden");
      
      // Update input area visibility after saving settings
      this.updateInputAreaVisibility();
      
      // Re-initialize AI handler if API key is now available
      if (apiToken && apiToken.trim().length > 0) {
        const inputField = document.querySelector<HTMLTextAreaElement>("#input-field")!;
        const inputArea = document.querySelector<HTMLDivElement>("#input-area")!;
        
        this.aiHandler = new AIHandler(this.editor, {
          inputField,
          inputArea,
          generationStatus: this.elements.generationStatus
        });
      } else {
        // Clear AI handler if API key is removed
        this.aiHandler = null as any;
      }
      
      // Show visual feedback 
      const statusMessage = document.createElement("div");
      statusMessage.textContent = "Settings saved successfully!";
      statusMessage.className = "settings-saved-message";
      document.body.appendChild(statusMessage);
      
      setTimeout(() => {
        statusMessage.classList.add("fade-out");
        setTimeout(() => document.body.removeChild(statusMessage), 500);
      }, 2000);
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

    // Close on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !settingsDialog.classList.contains("hidden")) {
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

  private handleMouseMove = (e: MouseEvent): void => {
    if (!state.isResizing) return;
    const containerWidth = this.elements.container.clientWidth;
    const newWidth = (e.clientX / containerWidth) * 100;
    const clampedWidth = Math.max(newWidth, EDITOR_CONFIG.minWidth);
    this.elements.editorPane.style.flexBasis = `${clampedWidth}%`;
  };

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

        const svg = this.elements.mermaidPreview.querySelector("svg");
        if (svg) {
          if (this.panZoomInstance) {
            this.panZoomInstance.destroy();
          }
          this.panZoomInstance = svgPanZoom(svg, {
            panEnabled: true,
            zoomEnabled: true,
            controlIconsEnabled: false,
            fit: true,
            center: true,
          });
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
    if (delta > 0) {
      this.panZoomInstance.zoomIn();
    } else {
      this.panZoomInstance.zoomOut();
    }
  };

  private updateInputAreaVisibility(): void {
    const inputArea = document.querySelector<HTMLDivElement>("#input-area")!;
    const apiKey = localStorage.getItem("googleAiApiKey") || "";
    
    if (!apiKey || apiKey.trim().length === 0) {
      // Show message instead of input field
      inputArea.innerHTML = `
        <div class="api-key-warning">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Please set up your Google AI API key in settings to use AI features</span>
        </div>
      `;
    } else {
      // Show input field
      inputArea.innerHTML = `
        <input type="text" id="input-field" placeholder="Enter your prompt here and press enter..." />
      `;
      
      // Re-attach event listeners to the new input field
      const newInputField = document.querySelector<HTMLInputElement>("#input-field");
      if (newInputField) {
        newInputField.addEventListener("keydown", async (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (this.aiHandler) {
              await this.aiHandler.handleSubmit();
            }
          }
        });
      }
    }
  }
}

// Initialize the editor
new MermaidEditor();

