import mermaid from "mermaid";
import svgPanZoom from "svg-pan-zoom";
import "./modern-normalize.css";
import "./style.css";
import { EditorState, EditorElements } from "./types";
import {
  EDITOR_CONFIG,
  MONACO_CONFIG,
  MERMAID_CONFIG,
  CREATION_PRESETS,
  MODIFICATION_PRESETS,
  AI_CONFIG,
  DEFAULT_MODELS,
} from "./config";
import { AIProviderType } from "./types";
import { AIHandler } from "./ai-handler";
import { CollaborationHandler } from "./collaboration";
import {
  debounce,
  loadDiagramFromURL,
  generateDiagramHash,
  getStoredEditorWidth,
  setStoredEditorWidth,
  parseMermaidError,
} from "./utils";
import { EventHelpers } from "./events";
import { SKILL_CONTENT } from "./skill-content";

let monacoInstance: any | null = null;

/**
 * Lazy loads Monaco editor and configures Mermaid language support
 */
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

const state: EditorState = {
  isResizing: false,
};

class MermaidEditor {
  private editor!: any;
  private elements!: EditorElements;
  private aiHandler!: AIHandler;
  private collaborationHandler!: CollaborationHandler;
  private panZoomInstance: any;
  private currentError: string | null = null;
  private monaco: any = null;
  private errorDecorations: string[] = [];
  private pendingError: { message: string; code: string } | null = null;
  private presetEventListenersSetup: boolean = false;

  constructor() {
    this.initializeApplication();
  }

  /**
   * Initialize the complete application
   */
  private initializeApplication(): void {
    this.initializeDOM();
    this.initializeMermaid();
    this.setupEventListeners();
    this.setupAppEventListeners();
    this.loadInitialState();
    this.updateInputAreaVisibility();
    this.setupPresets();

    EventHelpers.safeEmit("app:ready", {});
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
      zoomInButton: document.querySelector<HTMLButtonElement>("#zoom-in-btn")!,
      zoomOutButton: document.querySelector<HTMLButtonElement>("#zoom-out-btn")!,
      generationStatus: document.querySelector<HTMLSpanElement>("#generation-status")!,
    };

    this.elements.generationStatus = document.querySelector<HTMLSpanElement>("#generation-status")!;
    this.elements.generationStatus.style.display = "none";

    const settingsButton = document.querySelector<HTMLButtonElement>("#settings-btn")!;
    settingsButton.classList.add("button");
  }

  private handleEditorVisibility(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const hideEditor = urlParams.has("hideEditor");

    if (hideEditor) {
      this.hideEditorPane();
    } else {
      this.showEditorPane();
    }

    this.setupEditor();
  }

  private showEditorPane(): void {
    this.elements.editorPane.classList.add("visible");
    this.elements.handle.style.display = "block";
  }

  private hideEditorPane(): void {
    this.elements.editorPane.classList.remove("visible");
    this.elements.handle.style.display = "none";
  }

  private async setupEditor(): Promise<void> {
    const code = loadDiagramFromURL() || "";
    const editorElement = document.querySelector<HTMLDivElement>("#monaco-editor");

    if (!editorElement) return;

    this.monaco = await loadMonaco();
    this.editor = this.monaco.editor.create(editorElement, {
      value: code,
      ...MONACO_CONFIG,
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

    // Process any pending error now that editor is ready
    if (this.pendingError) {
      console.log("[DEBUG] Processing pending error after editor ready");
      this.setErrorMarkers(this.pendingError.message, this.pendingError.code);
      this.pendingError = null;
    }

    // Register code action provider for AI fixes
    this.registerAICodeActionProvider();

    // Emit editor ready event
    EventHelpers.safeEmit("editor:ready", { editor: this.editor });
  }

  private async setupHandlers(): Promise<void> {
    const inputField = document.querySelector<HTMLInputElement>("#input-field")!;
    const inputArea = document.querySelector<HTMLDivElement>("#input-area")!;

    // Only initialize AI handler if API key is available
    const apiKey = localStorage.getItem("aiApiKey") || "";
    if (apiKey && apiKey.trim().length > 0) {
      this.aiHandler = new AIHandler(this.editor, {
        inputField,
        inputArea,
        generationStatus: this.elements.generationStatus,
      });
    }

    // Lazy load collaboration handler
    if (window.location.search.includes("room")) {
      const { CollaborationHandler } = await import("./collaboration");
      this.collaborationHandler = new CollaborationHandler(this.editor);
      this.collaborationHandler.setup();
    }
  }

  private initializeMermaid(): void {
    mermaid.initialize(MERMAID_CONFIG);

    const code = loadDiagramFromURL();
    if (code && code.trim().length > 0) {
      this.renderDiagram(code);
    }
  }

  /**
   * Setup Monaco editor event listeners for content changes
   */
  private setupEditorEventListeners(): void {
    const debouncedEmitChange = debounce((code: string) => {
      EventHelpers.safeEmit("editor:change", { code });
    }, 250);
    const debouncedGenerateDiagramHash = debounce((code: string) => generateDiagramHash(code), 250);

    this.editor.onDidChangeModelContent(() => {
      requestAnimationFrame(() => {
        const code = this.editor.getValue();

        // Clear error state immediately when content becomes empty
        if (this.isEmptyCode(code)) {
          this.hideError();
        }

        debouncedEmitChange(code);
        debouncedGenerateDiagramHash(code);
      });
    });
  }

  private setupEventListeners(): void {
    this.setupResizeListeners();
    this.setupInputListeners();

    this.elements.zoomInButton.addEventListener("click", () => {
      EventHelpers.safeEmit("ui:zoom", { direction: "in" });
      this.handleZoomButtonClick(EDITOR_CONFIG.zoomFactor);
    });
    this.elements.zoomOutButton.addEventListener("click", () => {
      EventHelpers.safeEmit("ui:zoom", { direction: "out" });
      this.handleZoomButtonClick(-EDITOR_CONFIG.zoomFactor);
    });
    this.setupSettingsListeners();
    this.setupSkillModalListeners();
  }

  private setupAppEventListeners(): void {
    // Listen for editor changes to trigger diagram rendering
    EventHelpers.safeListen("editor:change", async ({ code }) => {
      await this.renderDiagram(code);
    });

    // Listen for AI completion to trigger diagram update
    EventHelpers.safeListen("ai:complete", async ({ code }) => {
      EventHelpers.safeEmit("editor:change", { code });
    });

    // Listen for diagram render requests
    EventHelpers.safeListen("diagram:render", async ({ code }) => {
      await this.renderMermaidDiagram(code);
    });

    // Listen for app loading state changes
    EventHelpers.safeListen("app:loading", ({ isLoading }) => {
      // Update global loading state if needed
      document.body.classList.toggle("loading", isLoading);
    });

    // Listen for app errors
    EventHelpers.safeListen("app:error", ({ error }) => {
      console.error("App error:", error);
      this.showError(error);
    });
  }

  private setupInputListeners(): void {
    const inputField = document.querySelector<HTMLInputElement>("#input-field");
    if (inputField) {
      inputField.addEventListener("keydown", async (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const prompt = inputField.value.trim();
          if (prompt) {
            EventHelpers.safeEmit("ui:input:submit", { prompt });
          }
        }
      });
    }
  }

  private setupSettingsListeners(): void {
    const settingsBtn = document.querySelector<HTMLButtonElement>("#settings-btn")!;
    const settingsDialog = document.querySelector<HTMLDivElement>("#settings-dialog")!;
    const saveSettingsBtn = document.querySelector<HTMLButtonElement>("#save-settings")!;
    const providerSelect = document.querySelector<HTMLSelectElement>("#ai-provider")!;
    const apiTokenInput = document.querySelector<HTMLInputElement>("#api-token")!;
    const modelIdInput = document.querySelector<HTMLInputElement>("#model-id")!;
    const modelHint = document.querySelector<HTMLElement>("#model-hint")!;

    // Model hints per provider
    const modelHints: Record<AIProviderType, string> = {
      google: "e.g., gemini-2.5-pro, gemini-2.0-flash",
      openai: "e.g., gpt-4o, gpt-4-turbo, gpt-3.5-turbo",
      anthropic: "e.g., claude-sonnet-4-20250514, claude-3-5-sonnet-20241022",
    };

    // Load saved settings
    const savedProvider = (localStorage.getItem("aiProvider") as AIProviderType) || "google";
    providerSelect.value = savedProvider;
    apiTokenInput.value = localStorage.getItem("aiApiKey") || "";
    modelIdInput.value = localStorage.getItem("aiModel") || DEFAULT_MODELS[savedProvider];
    modelIdInput.placeholder = DEFAULT_MODELS[savedProvider];
    modelHint.textContent = modelHints[savedProvider];

    // Update model hint when provider changes
    providerSelect.addEventListener("change", () => {
      const provider = providerSelect.value as AIProviderType;
      modelIdInput.placeholder = DEFAULT_MODELS[provider];
      modelHint.textContent = modelHints[provider];
      // Update model to default if current model doesn't match new provider
      if (!modelIdInput.value || modelIdInput.value === DEFAULT_MODELS[savedProvider]) {
        modelIdInput.value = DEFAULT_MODELS[provider];
      }
    });

    settingsBtn.addEventListener("click", () => {
      EventHelpers.safeEmit("ui:settings:open", {});
      settingsDialog.classList.toggle("hidden");
      if (!settingsDialog.classList.contains("hidden")) {
        providerSelect.focus();
      }
    });

    saveSettingsBtn.addEventListener("click", () => {
      const provider = providerSelect.value as AIProviderType;
      const apiToken = apiTokenInput.value.trim();
      const modelId = modelIdInput.value.trim() || DEFAULT_MODELS[provider];

      localStorage.setItem("aiProvider", provider);
      localStorage.setItem("aiApiKey", apiToken);
      localStorage.setItem("aiModel", modelId);

      AI_CONFIG.provider = provider;
      AI_CONFIG.apiKey = apiToken;
      AI_CONFIG.model = modelId;
      settingsDialog.classList.add("hidden");

      // Emit settings save event
      EventHelpers.safeEmit("ui:settings:save", { provider, apiKey: apiToken, model: modelId });

      // Update input area visibility after saving settings
      this.updateInputAreaVisibility();

      // Initialize or clear AI handler based on API key availability
      if (apiToken && apiToken.trim().length > 0) {
        // Always recreate AI handler when settings change to pick up new provider
        const inputField = document.querySelector<HTMLInputElement>("#input-field");
        const inputArea = document.querySelector<HTMLDivElement>("#input-area")!;

        if (inputField) {
          this.aiHandler = new AIHandler(this.editor, {
            inputField,
            inputArea,
            generationStatus: this.elements.generationStatus,
          });
        }
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
      const width = this.elements.editorPane.style.flexBasis;
      setStoredEditorWidth(width);
      EventHelpers.safeEmit("editor:resize", { width });
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

  /**
   * Render Mermaid diagram with error handling and UI updates
   */
  private async renderMermaidDiagram(code: string): Promise<void> {
    try {
      this.clearPreview();

      if (this.isEmptyCode(code)) {
        this.hideError();
        return;
      }

      await this.validateAndRenderDiagram(code);
    } catch (error) {
      this.handleRenderError(error, code);
    }
  }

  /**
   * Clear the diagram preview
   */
  private clearPreview(): void {
    this.elements.mermaidPreview.innerHTML = "";
  }

  /**
   * Check if code is empty or only whitespace
   */
  private isEmptyCode(code: string): boolean {
    return !code || code.trim().length === 0;
  }

  /**
   * Validate and render the Mermaid diagram
   */
  private async validateAndRenderDiagram(code: string): Promise<void> {
    if (!(await mermaid.parse(code))) {
      throw new Error("Invalid diagram syntax");
    }

    const tempDiv = this.createTempRenderDiv();
    const result = await mermaid.render("mermaid-diagram", code, tempDiv);

    requestAnimationFrame(() => {
      this.updatePreviewWithSVG(result.svg);
      this.setupPanZoom();
      EventHelpers.safeEmit("diagram:rendered", { svg: result.svg });
      document.body.removeChild(tempDiv);
    });
  }

  /**
   * Create temporary div for Mermaid rendering
   */
  private createTempRenderDiv(): HTMLDivElement {
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.visibility = "hidden";
    document.body.appendChild(tempDiv);
    return tempDiv;
  }

  /**
   * Update preview with rendered SVG
   */
  private updatePreviewWithSVG(svg: string): void {
    this.elements.mermaidPreview.innerHTML = svg;
    this.hideError();
  }

  /**
   * Setup pan and zoom functionality for the SVG
   */
  private setupPanZoom(): void {
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
  }

  /**
   * Handle diagram rendering errors
   */
  private handleRenderError(error: unknown, code: string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.currentError = errorMessage;

    this.processErrorMarkers(errorMessage, code);
    this.emitErrorEvents(errorMessage);
    this.showError(errorMessage);
    this.showFixWithAIOption();
  }

  /**
   * Process error markers for Monaco editor
   */
  private processErrorMarkers(errorMessage: string, code: string): void {
    if (this.editor && (this.monaco || monacoInstance)) {
      this.setErrorMarkers(errorMessage, code);
    } else {
      this.pendingError = { message: errorMessage, code: code };
    }
  }

  /**
   * Emit error events
   */
  private emitErrorEvents(errorMessage: string): void {
    EventHelpers.safeEmit("diagram:error", { error: errorMessage });
    EventHelpers.safeEmit("editor:error", { error: errorMessage });
  }

  /**
   * Render diagram (wrapper method for renderMermaidDiagram)
   */
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

    // Clear Monaco error markers
    this.clearErrorMarkers();

    // Hide error-specific elements
    const fixButton = document.querySelector<HTMLButtonElement>("#fix-with-ai-btn");
    const errorWarning = document.querySelector<HTMLDivElement>(".api-key-warning.error-state");
    if (fixButton) fixButton.style.display = "none";
    if (errorWarning) errorWarning.style.display = "none";

    // Restore normal input area when error is cleared
    this.updateInputAreaVisibility();
  }

  /**
   * Set error markers in Monaco Editor
   */
  private setErrorMarkers(error: string, code: string): void {
    if (!this.ensureMonacoAvailable()) return;

    const model = this.editor.getModel();
    if (!model) return;

    const parsedError = parseMermaidError(error, code);
    const markers = this.createErrorMarkers(parsedError, code);
    this.applyErrorDecorations(parsedError, code);

    if (markers.length > 0) {
      this.monaco.editor.setModelMarkers(model, "mermaid", markers);
    }
  }

  /**
   * Ensure Monaco is available for error marking
   */
  private ensureMonacoAvailable(): boolean {
    if (!this.monaco && monacoInstance) {
      this.monaco = monacoInstance;
    }

    return !!(this.monaco && this.editor);
  }

  /**
   * Create error markers for Monaco editor
   */
  private createErrorMarkers(parsedError: any, code: string): any[] {
    const markers = [];

    if (parsedError.line) {
      const marker = this.createLineMarker(parsedError, code);
      markers.push(marker);
    } else {
      const fallbackMarker = this.createFallbackMarker(parsedError, code);
      if (fallbackMarker) markers.push(fallbackMarker);
    }

    return markers;
  }

  /**
   * Create marker for specific line
   */
  private createLineMarker(parsedError: any, code: string): any {
    const startColumn = parsedError.column || 1;
    const lines = code.split("\n");
    const lineContent = lines[parsedError.line - 1] || "";
    const endColumn = parsedError.column ? parsedError.column + 1 : lineContent.length + 1;

    return {
      startLineNumber: parsedError.line,
      endLineNumber: parsedError.line,
      startColumn: startColumn,
      endColumn: endColumn,
      message: parsedError.message,
      severity: this.monaco.MarkerSeverity.Error,
    };
  }

  /**
   * Create fallback marker for first non-empty line
   */
  private createFallbackMarker(parsedError: any, code: string): any | null {
    const lines = code.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith("%%") && !line.startsWith("#")) {
        return {
          startLineNumber: i + 1,
          endLineNumber: i + 1,
          startColumn: 1,
          endColumn: lines[i].length + 1,
          message: parsedError.message,
          severity: this.monaco.MarkerSeverity.Error,
        };
      }
    }
    return null;
  }

  /**
   * Apply error decorations to editor lines
   */
  private applyErrorDecorations(parsedError: any, code: string): void {
    const lines = code.split("\n");
    let lineNumber = parsedError.line;

    if (!lineNumber) {
      lineNumber = this.findFirstContentLine(lines);
    }

    if (lineNumber) {
      const lineContent = lines[lineNumber - 1] || "";
      const decorationRange = new this.monaco.Range(
        lineNumber,
        1,
        lineNumber,
        lineContent.length + 1,
      );

      this.errorDecorations = this.editor.deltaDecorations(this.errorDecorations, [
        {
          range: decorationRange,
          options: {
            isWholeLine: true,
            className: "mermaid-error-line",
            glyphMarginClassName: "mermaid-error-glyph",
            linesDecorationsClassName: "mermaid-error-line-number",
          },
        },
      ]);
    }
  }

  /**
   * Find first non-empty, non-comment line
   */
  private findFirstContentLine(lines: string[]): number | null {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith("%%") && !line.startsWith("#")) {
        return i + 1;
      }
    }
    return null;
  }

  /**
   * Clear all error markers from Monaco Editor
   */
  private clearErrorMarkers(): void {
    if (!this.ensureMonacoAvailable()) return;

    const model = this.editor.getModel();
    if (!model) return;

    this.monaco.editor.setModelMarkers(model, "mermaid", []);
    this.errorDecorations = this.editor.deltaDecorations(this.errorDecorations, []);
  }

  /**
   * Register Monaco code action provider for AI-powered quick fixes
   */
  private registerAICodeActionProvider(): void {
    if (!this.monaco || !this.editor) {
      console.log(
        "[DEBUG] Cannot register AI code action provider - monaco or editor not available",
        {
          monaco: !!this.monaco,
          editor: !!this.editor,
        },
      );
      return;
    }

    console.log("[DEBUG] Registering AI code action provider", {
      monaco: !!this.monaco,
      editor: !!this.editor,
      monacoVersion: this.monaco.editor.VERSION || "unknown",
    });

    const actionProvider = {
      provideCodeActions: (model: any, range: any, context: any) => {
        console.log("[DEBUG] provideCodeActions called", { range, context });

        // Check if there are any markers (errors) in the current range
        const markers = this.monaco.editor.getModelMarkers({
          resource: model.uri,
        });

        const markersInRange = markers.filter((marker: any) => {
          return (
            marker.startLineNumber >= range.startLineNumber &&
            marker.endLineNumber <= range.endLineNumber
          );
        });

        console.log("[DEBUG] Markers in range:", markersInRange);

        if (markersInRange.length === 0) {
          return { actions: [], dispose: () => {} };
        }

        const actions = markersInRange.map((marker: any) => ({
          title: "🤖 Fix with AI",
          kind: "quickfix",
          diagnostics: [marker],
          isPreferred: true,
          command: {
            id: "mermaid.fixWithAI",
            title: "Fix with AI",
          },
        }));

        return {
          actions: actions,
          dispose: () => {},
        };
      },
    };

    // Register the code action provider
    const disposable1 = this.monaco.languages.registerCodeActionProvider("mermaid", actionProvider);
    console.log("[DEBUG] Code action provider registered:", !!disposable1);

    // Register the command that will be executed when the action is clicked
    const disposable2 = this.editor.addCommand(
      this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.Period, // Ctrl/Cmd + .
      () => {
        console.log("[DEBUG] Quick fix shortcut triggered");
        this.editor.trigger("", "editor.action.quickFix", null);
      },
    );
    console.log("[DEBUG] Quick fix shortcut registered:", !!disposable2);

    // Register the fix command - just emit an event to trigger existing AI fix logic
    const commandId = "mermaid.fixWithAI";

    try {
      // Register the command with Monaco's command service
      this.monaco.editor.registerCommand(commandId, () => {
        console.log("[DEBUG] Fix with AI command triggered");

        // Just emit an event to trigger the existing AI fix logic
        EventHelpers.safeEmit("ui:fixWithAI", {});

        // Call the existing handleFixWithAI method
        this.handleFixWithAI();
      });
      console.log("[DEBUG] Monaco command registered:", commandId);

      // Also add it as an editor action for context menu and keybindings
      const actionDisposable = this.editor.addAction({
        id: commandId,
        label: "Fix Mermaid Error with AI",
        keybindings: [
          this.monaco.KeyMod.CtrlCmd | this.monaco.KeyMod.Shift | this.monaco.KeyCode.KeyF,
        ],
        contextMenuGroupId: "navigation",
        contextMenuOrder: 1.5,
        run: () => {
          console.log("[DEBUG] Fix with AI action triggered");

          // Just emit an event to trigger the existing AI fix logic
          EventHelpers.safeEmit("ui:fixWithAI", {});

          // Call the existing handleFixWithAI method
          this.handleFixWithAI();
        },
      });
      console.log("[DEBUG] Editor action registered:", commandId, !!actionDisposable);
    } catch (error) {
      console.error("[DEBUG] Error registering AI fix command:", error);
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
    const inputField = document.querySelector<HTMLInputElement>("#input-field");
    const presetButton = document.querySelector<HTMLButtonElement>("#preset-btn");
    const presetCard = document.querySelector<HTMLDivElement>("#preset-card");
    const apiKeyWarning = document.querySelector<HTMLDivElement>(".api-key-warning");
    const fixButton = document.querySelector<HTMLButtonElement>("#fix-with-ai-btn");
    const apiKey = localStorage.getItem("aiApiKey") || "";

    // Hide normal input elements
    if (inputField) inputField.style.display = "none";
    if (presetButton) presetButton.style.display = "none";
    if (presetCard) presetCard.classList.add("hidden");
    if (apiKeyWarning) apiKeyWarning.style.display = "none";

    if (apiKey && apiKey.trim().length > 0) {
      // Show or create fix with AI button when there's an error and API key is available
      if (!fixButton) {
        const newFixButton = document.createElement("button");
        newFixButton.id = "fix-with-ai-btn";
        newFixButton.className = "fix-with-ai-button";
        newFixButton.title = "Fix this Mermaid diagram with AI";
        newFixButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
          Fix with AI
        `;
        inputArea.appendChild(newFixButton);

        // Attach event listener to the fix button
        newFixButton.addEventListener("click", async () => {
          await this.handleFixWithAI();
        });
      } else {
        fixButton.style.display = "block";
      }
    } else {
      // Show or create API key warning when there's an error but no API key
      let errorWarning = document.querySelector<HTMLDivElement>(".api-key-warning.error-state");
      if (!errorWarning) {
        errorWarning = document.createElement("div");
        errorWarning.className = "api-key-warning error-state";
        errorWarning.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Set up your AI API key in settings to fix errors with AI</span>
        `;
        inputArea.appendChild(errorWarning);
      } else {
        errorWarning.style.display = "flex";
      }
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

    // Get or create the input field without removing existing ones
    const inputArea = document.querySelector<HTMLDivElement>("#input-area")!;
    let inputField = document.querySelector<HTMLInputElement>("#input-field");

    if (!inputField) {
      inputField = document.createElement("input");
      inputField.type = "text";
      inputField.id = "input-field";
      inputField.style.display = "none";
      inputArea.appendChild(inputField);

      // Attach event listener to the new input field
      inputField.addEventListener("keydown", async (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (this.aiHandler) {
            await this.aiHandler.handleSubmit();
          }
        }
      });
    }

    // Set the fix prompt as the input value
    inputField.value = fixPrompt;

    // Ensure AI handler is properly initialized with current DOM elements
    if (!this.aiHandler) {
      this.aiHandler = new AIHandler(this.editor, {
        inputField,
        inputArea,
        generationStatus: this.elements.generationStatus,
      });
    }

    await this.aiHandler.handleSubmit();
  }

  /**
   * Update input area visibility based on API key availability
   */
  private updateInputAreaVisibility(): void {
    if (this.currentError) return;

    const elements = this.getInputAreaElements();
    const apiKey = localStorage.getItem("aiApiKey") || "";
    const hasApiKey = apiKey.trim().length > 0;

    if (hasApiKey) {
      this.showAIInputElements(elements);
    } else {
      this.showApiKeyWarning(elements);
    }
  }

  /**
   * Get input area DOM elements
   */
  private getInputAreaElements() {
    return {
      inputArea: document.querySelector<HTMLDivElement>("#input-area")!,
      inputField: document.querySelector<HTMLInputElement>("#input-field"),
      presetButton: document.querySelector<HTMLButtonElement>("#preset-btn"),
      presetCard: document.querySelector<HTMLDivElement>("#preset-card"),
      apiKeyWarning: document.querySelector<HTMLDivElement>(".api-key-warning"),
    };
  }

  /**
   * Show AI input elements (input field and presets)
   */
  private showAIInputElements(elements: any): void {
    this.hideApiKeyWarning(elements.apiKeyWarning);
    this.ensureInputField(elements);
    this.ensurePresetButton(elements);
    this.ensurePresetCard(elements);
    this.setupPresets();
  }

  /**
   * Show API key warning and hide other elements
   */
  private showApiKeyWarning(elements: any): void {
    this.hideInputElements(elements);
    this.createOrShowApiKeyWarning(elements);
  }

  /**
   * Hide input field and preset elements
   */
  private hideInputElements(elements: any): void {
    if (elements.inputField) elements.inputField.style.display = "none";
    if (elements.presetButton) elements.presetButton.style.display = "none";
    if (elements.presetCard) elements.presetCard.classList.add("hidden");
  }

  /**
   * Hide API key warning
   */
  private hideApiKeyWarning(apiKeyWarning: HTMLElement | null): void {
    if (apiKeyWarning) apiKeyWarning.style.display = "none";
  }

  /**
   * Create or show API key warning element
   */
  private createOrShowApiKeyWarning(elements: any): void {
    if (!elements.apiKeyWarning) {
      this.createApiKeyWarning(elements.inputArea);
    } else {
      elements.apiKeyWarning.style.display = "flex";
    }
  }

  /**
   * Create API key warning element
   */
  private createApiKeyWarning(inputArea: HTMLElement): void {
    const warningDiv = document.createElement("div");
    warningDiv.className = "api-key-warning";
    warningDiv.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <span>Please set up your AI API key in settings to use AI features</span>
    `;
    inputArea.appendChild(warningDiv);
  }

  /**
   * Ensure input field exists and is visible
   */
  private ensureInputField(elements: any): void {
    if (!elements.inputField) {
      this.createInputField(elements.inputArea);
    } else {
      elements.inputField.style.display = "block";
    }
  }

  /**
   * Create input field element
   */
  private createInputField(inputArea: HTMLElement): void {
    const newInputField = document.createElement("input");
    newInputField.type = "text";
    newInputField.id = "input-field";
    newInputField.placeholder = "Enter your prompt here and press enter...";
    inputArea.appendChild(newInputField);

    this.attachInputFieldListener(newInputField);
  }

  /**
   * Attach event listener to input field
   */
  private attachInputFieldListener(inputField: HTMLInputElement): void {
    inputField.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (this.aiHandler) {
          await this.aiHandler.handleSubmit();
        }
      }
    });
  }

  /**
   * Ensure preset button exists and is visible
   */
  private ensurePresetButton(elements: any): void {
    if (!elements.presetButton) {
      this.createPresetButton(elements.inputArea);
    } else {
      elements.presetButton.style.display = "block";
    }
  }

  /**
   * Create preset button element
   */
  private createPresetButton(inputArea: HTMLElement): void {
    const newPresetButton = document.createElement("button");
    newPresetButton.id = "preset-btn";
    newPresetButton.className = "preset-button";
    newPresetButton.title = "Choose from presets";
    newPresetButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 9h6v6H9z"/>
      </svg>
    `;
    inputArea.insertBefore(newPresetButton, inputArea.firstChild);
  }

  /**
   * Ensure preset card exists
   */
  private ensurePresetCard(elements: any): void {
    if (!elements.presetCard) {
      this.createPresetCard(elements.inputArea);
    } else {
      elements.presetCard.classList.add("hidden");
    }
  }

  /**
   * Create preset card element
   */
  private createPresetCard(inputArea: HTMLElement): void {
    const newPresetCard = document.createElement("div");
    newPresetCard.id = "preset-card";
    newPresetCard.className = "preset-card hidden";
    newPresetCard.innerHTML = `
      <div class="preset-header">
        <h3>Choose a preset</h3>
      </div>
      <div class="preset-grid" id="preset-grid">
        <!-- Preset items will be populated by JavaScript -->
      </div>
    `;
    inputArea.appendChild(newPresetCard);
  }

  private setupPresets(): void {
    this.populatePresetGrid();
    if (!this.presetEventListenersSetup) {
      this.setupPresetEventListeners();
      this.presetEventListenersSetup = true;
    }
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
        const isModification = presetType === "modification";
        EventHelpers.safeEmit("ui:preset:select", { preset, isModification });
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

  private setupSkillModalListeners(): void {
    const skillBtn = document.querySelector<HTMLButtonElement>("#claude-skill-btn");
    const skillModal = document.querySelector<HTMLDivElement>("#skill-modal");
    const skillModalClose = document.querySelector<HTMLButtonElement>("#skill-modal-close");
    const copySkillBtn = document.querySelector<HTMLButtonElement>("#copy-skill-btn");
    const downloadSkillBtn = document.querySelector<HTMLButtonElement>("#download-skill-btn");

    if (!skillBtn || !skillModal) return;

    // Toggle skill modal
    skillBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      skillModal.classList.toggle("hidden");
    });

    // Close modal
    skillModalClose?.addEventListener("click", () => {
      skillModal.classList.add("hidden");
    });

    // Copy skill to clipboard
    copySkillBtn?.addEventListener("click", async () => {
      await navigator.clipboard.writeText(SKILL_CONTENT);

      // Show success state - using textContent for the text part
      const svgEl = copySkillBtn.querySelector("svg");
      if (svgEl) {
        svgEl.outerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      }
      const textNode = copySkillBtn.lastChild;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        textNode.textContent = " Copied!";
      }
      copySkillBtn.classList.add("success");
      copySkillBtn.classList.remove("primary");

      setTimeout(() => {
        const svgEl = copySkillBtn.querySelector("svg");
        if (svgEl) {
          svgEl.outerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
        }
        const textNode = copySkillBtn.lastChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          textNode.textContent = " Copy to Clipboard";
        }
        copySkillBtn.classList.remove("success");
        copySkillBtn.classList.add("primary");
      }, 2000);
    });

    // Download skill file
    downloadSkillBtn?.addEventListener("click", () => {
      const blob = new Blob([SKILL_CONTENT], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "SKILL.md";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // Close modal when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !skillModal.contains(e.target as Node) &&
        !skillBtn.contains(e.target as Node) &&
        !skillModal.classList.contains("hidden")
      ) {
        skillModal.classList.add("hidden");
      }
    });

    // Close on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !skillModal.classList.contains("hidden")) {
        skillModal.classList.add("hidden");
      }
    });
  }
}

// Initialize the editor
new MermaidEditor();
