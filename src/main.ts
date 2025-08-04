import mermaid from "mermaid";
import svgPanZoom from "svg-pan-zoom";
import "./modern-normalize.css";
import "./style.css";
import { EditorState, EditorElements } from "./types";
import { EDITOR_CONFIG, MONACO_CONFIG, MERMAID_CONFIG, CREATION_PRESETS, MODIFICATION_PRESETS, AI_CONFIG } from "./config";
import { AIHandler } from "./ai-handler";
import { CollaborationHandler } from "./collaboration";
import { debounce, loadDiagramFromURL, generateDiagramHash, getStoredEditorWidth, setStoredEditorWidth } from "./utils";

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
  private currentError: string | null = null;
  private autoFixRetryCount: number = 0;
  private readonly MAX_AUTO_FIX_ATTEMPTS = 3;
  private isAutoFixing: boolean = false;

  constructor() {
    this.initializeDOM();
    this.initializeMermaid();
    this.setupEventListeners();
    this.loadInitialState();
    this.updateInputAreaVisibility();
    this.setupPresets();
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
    const inputField = document.querySelector<HTMLInputElement>("#input-field")!;
    const inputArea = document.querySelector<HTMLDivElement>("#input-area")!

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
    const inputField = document.querySelector<HTMLInputElement>("#input-field");
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
      AI_CONFIG.apiKey = apiToken;
      settingsDialog.classList.add("hidden");
      
      // Update input area visibility after saving settings
      this.updateInputAreaVisibility();
      
      // Re-initialize AI handler if API key is now available
      if (apiToken && apiToken.trim().length > 0) {
        const inputField = document.querySelector<HTMLInputElement>("#input-field")!;
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
      const errorMessage = error instanceof Error ? error.message : "Failed to render diagram";
      this.currentError = errorMessage;
      this.showError(errorMessage);
      
      // Automatically attempt to fix the error if we haven't exceeded max attempts and aren't already auto-fixing
      if (this.autoFixRetryCount < this.MAX_AUTO_FIX_ATTEMPTS && this.aiHandler && !this.isAutoFixing) {
        console.log(`Auto-fixing attempt ${this.autoFixRetryCount + 1}/${this.MAX_AUTO_FIX_ATTEMPTS}`);
        this.autoFixRetryCount++;
        this.isAutoFixing = true;
        await this.handleAutoFixWithAI();
      } else {
        // Reset retry count for future manual fixes if we've exceeded attempts
        if (this.autoFixRetryCount >= this.MAX_AUTO_FIX_ATTEMPTS) {
          this.autoFixRetryCount = 0;
        }
        this.showFixWithAIOption();
      }
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
    this.currentError = null;
    this.autoFixRetryCount = 0; // Reset retry count when error is cleared
    this.isAutoFixing = false; // Reset auto-fixing flag
    // Restore normal input area when error is cleared
    this.updateInputAreaVisibility();
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

  private showFixWithAIOption(): void {
    const inputArea = document.querySelector<HTMLDivElement>("#input-area")!;
    const apiKey = localStorage.getItem("googleAiApiKey") || "";
    
    if (apiKey && apiKey.trim().length > 0) {
      // Show fix with AI button when there's an error and API key is available
      inputArea.innerHTML = `
        <button id="fix-with-ai-btn" class="fix-with-ai-button" title="Fix this Mermaid diagram with AI">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
          Fix with AI
        </button>
      `;
      
      // Attach event listener to the fix button
      const fixButton = document.querySelector<HTMLButtonElement>("#fix-with-ai-btn");
      if (fixButton) {
        fixButton.addEventListener("click", async () => {
          await this.handleFixWithAI();
        });
      }
    } else {
      // Show API key warning when there's an error but no API key
      inputArea.innerHTML = `
        <div class="api-key-warning error-state">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Set up your Google AI API key in settings to fix errors with AI</span>
        </div>
      `;
    }
  }

  private async handleFixWithAI(): Promise<void> {
    if (!this.aiHandler || !this.currentError) return;

    const currentCode = this.editor.getValue();
    const errorMessage = this.currentError;
    
    // Create a fix prompt with the current code and error
    const fixPrompt = `Please fix the following Mermaid diagram code that has an error:

Error: ${errorMessage}

Current code:
\`\`\`mermaid
${currentCode}
\`\`\`

Please provide the corrected Mermaid diagram code that fixes this error while preserving the intent of the original diagram.`;

    // Create a temporary input field and restore the normal input area
    const inputArea = document.querySelector<HTMLDivElement>("#input-area")!;
    inputArea.innerHTML = `<input type="text" id="input-field" style="display: none;" />`;
    const tempInputField = document.querySelector<HTMLInputElement>("#input-field")!;
    tempInputField.value = fixPrompt;
    
    // Re-create AI handler with the temporary input field to ensure proper element references
    const generationStatus = this.elements.generationStatus;
    this.aiHandler = new AIHandler(this.editor, {
      inputField: tempInputField,
      inputArea: inputArea,
      generationStatus: generationStatus
    });
    
    await this.aiHandler.handleSubmit();
  }

  private async handleAutoFixWithAI(): Promise<void> {
    if (!this.aiHandler || !this.currentError) return;

    const currentCode = this.editor.getValue();
    const errorMessage = this.currentError;
    
    // Update status to show auto-fixing
    this.elements.generationStatus.style.display = "block";
    this.elements.generationStatus.textContent = `🔧 Auto-fixing attempt ${this.autoFixRetryCount}/${this.MAX_AUTO_FIX_ATTEMPTS}...`;
    
    // Create a fix prompt with the current code and error
    const fixPrompt = `Please fix the following Mermaid diagram code that has an error:

Error: ${errorMessage}

Current code:
\`\`\`mermaid
${currentCode}
\`\`\`

Please provide the corrected Mermaid diagram code that fixes this error while preserving the intent of the original diagram.`;

    try {
      // Call the AI handler's submit logic directly without modifying the UI
      await this.submitAutoFixRequest(fixPrompt);
    } catch (error) {
      console.error("Auto-fix failed:", error);
      // If auto-fix fails, show the manual fix option
      this.autoFixRetryCount = 0;
      this.isAutoFixing = false;
      this.showFixWithAIOption();
      this.elements.generationStatus.style.display = "none";
    } finally {
      // Always reset the auto-fixing flag when done
      this.isAutoFixing = false;
    }
  }

  private async submitAutoFixRequest(prompt: string): Promise<void> {
    if (!this.aiHandler) return;

    // Create a temporary AI handler instance for auto-fixing
    const tempInputField = document.createElement('input');
    tempInputField.type = 'text';
    tempInputField.value = prompt;
    tempInputField.style.display = 'none';
    document.body.appendChild(tempInputField);

    const tempInputArea = document.createElement('div');
    tempInputArea.style.display = 'none';
    document.body.appendChild(tempInputArea);

    try {
      // Create a temporary AI handler for this auto-fix request
      const autoFixAIHandler = new AIHandler(this.editor, {
        inputField: tempInputField,
        inputArea: tempInputArea,
        generationStatus: this.elements.generationStatus
      });

      await autoFixAIHandler.handleSubmit();
    } finally {
      // Clean up temporary elements
      document.body.removeChild(tempInputField);
      document.body.removeChild(tempInputArea);
    }
  }

  private updateInputAreaVisibility(): void {
    // Don't update input area if there's a current error - let showFixWithAIOption handle it
    if (this.currentError) {
      return;
    }

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
      // Show input field with preset button
      inputArea.innerHTML = `
        <button id="preset-btn" class="preset-button" title="Choose from presets">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 9h6v6H9z"/>
          </svg>
        </button>
        <input type="text" id="input-field" placeholder="Enter your prompt here and press enter..." />
        <div id="preset-card" class="preset-card hidden">
          <div class="preset-header">
            <h3>Choose a preset</h3>
          </div>
          <div class="preset-grid" id="preset-grid">
            <!-- Preset items will be populated by JavaScript -->
          </div>
        </div>
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

      // Re-setup presets after DOM update
      this.setupPresets();
    }
  }

  private setupPresets(): void {
    this.populatePresetGrid();
    this.setupPresetEventListeners();
  }

  private hasEditorContent(): boolean {
    if (!this.editor) return false;
    const content = this.editor.getValue().trim();
    return content.length > 0;
  }

  private populatePresetGrid(): void {
    const presetGrid = document.querySelector<HTMLDivElement>("#preset-grid");
    const presetHeader = document.querySelector<HTMLDivElement>(".preset-header h3");
    if (!presetGrid || !presetHeader) return;

    const hasContent = this.hasEditorContent();
    const presets = hasContent ? MODIFICATION_PRESETS : CREATION_PRESETS;
    const headerText = hasContent ? "Modify current diagram" : "Create new diagram";

    presetHeader.textContent = headerText;
    presetGrid.innerHTML = "";
    
    presets.forEach((preset, index) => {
      const presetItem = document.createElement("button");
      presetItem.className = "preset-item";
      presetItem.dataset.presetIndex = index.toString();
      presetItem.dataset.presetType = hasContent ? "modification" : "creation";
      
      const title = document.createElement("div");
      title.className = "preset-item-title";
      title.textContent = preset.title;
      
      const description = document.createElement("div");
      description.className = "preset-item-description";
      description.textContent = preset.prompt;
      
      presetItem.appendChild(title);
      presetItem.appendChild(description);
      presetGrid.appendChild(presetItem);
    });
  }

  private setupPresetEventListeners(): void {
    const presetButton = document.querySelector<HTMLButtonElement>("#preset-btn");
    const presetCard = document.querySelector<HTMLDivElement>("#preset-card");
    const presetGrid = document.querySelector<HTMLDivElement>("#preset-grid");

    if (!presetButton || !presetCard || !presetGrid) return;

    // Toggle preset card visibility
    presetButton.addEventListener("click", (e) => {
      e.stopPropagation();
      
      // Repopulate presets based on current editor state before showing
      if (presetCard.classList.contains("hidden")) {
        this.populatePresetGrid();
      }
      
      presetCard.classList.toggle("hidden");
    });

    // Handle preset selection
    presetGrid.addEventListener("click", async (e) => {
      const presetItem = (e.target as Element).closest(".preset-item") as HTMLButtonElement;
      if (!presetItem || !presetItem.dataset.presetIndex || !presetItem.dataset.presetType) return;

      const presetIndex = parseInt(presetItem.dataset.presetIndex);
      const presetType = presetItem.dataset.presetType;
      const presets = presetType === "modification" ? MODIFICATION_PRESETS : CREATION_PRESETS;
      const preset = presets[presetIndex];
      
      if (preset) {
        await this.selectPreset(preset.prompt, presetType === "modification");
        presetCard.classList.add("hidden");
      }
    });

    // Close preset card when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !presetCard.contains(e.target as Node) &&
        !presetButton.contains(e.target as Node) &&
        !presetCard.classList.contains("hidden")
      ) {
        presetCard.classList.add("hidden");
      }
    });

    // Close on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !presetCard.classList.contains("hidden")) {
        presetCard.classList.add("hidden");
      }
    });
  }

  private async selectPreset(prompt: string, isModification: boolean = false): Promise<void> {
    const inputField = document.querySelector<HTMLInputElement>("#input-field");
    if (!inputField) return;

    let finalPrompt = prompt;

    // For modification presets, include the current diagram context
    if (isModification && this.editor) {
      const currentCode = this.editor.getValue().trim();
      finalPrompt = `${prompt}

Current diagram:
\`\`\`mermaid
${currentCode}
\`\`\`

Please provide the modified Mermaid diagram code.`;
    }

    // Fill the input field with the preset prompt
    inputField.value = finalPrompt;
    inputField.focus();

    // Auto-submit if AI handler is available
    if (this.aiHandler) {
      await this.aiHandler.handleSubmit();
    }
  }
}

// Initialize the editor
new MermaidEditor();

