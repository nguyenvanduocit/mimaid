import type { Agentd } from "./agentd";
import { EventHelpers } from "./events";
import { buildAgentPrompt, extractMermaid } from "./ai-prompt";

/**
 * Handles AI-powered diagram generation by prompting an agent on the user's computer through agentd
 */
export class AIHandler {
  private editor: any;
  private agentd: Agentd;
  private elements: {
    inputField: HTMLTextAreaElement | HTMLInputElement;
    inputArea: HTMLDivElement;
    generationStatus: HTMLSpanElement;
  };

  constructor(
    editor: any,
    elements: {
      inputField: HTMLTextAreaElement | HTMLInputElement;
      inputArea: HTMLDivElement;
      generationStatus: HTMLSpanElement;
    },
    agentd: Agentd,
  ) {
    this.editor = editor;
    this.elements = elements;
    this.agentd = agentd;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    EventHelpers.safeListen("ui:input:submit", async ({ prompt }) => {
      this.elements.inputField.value = prompt;
      await this.handleSubmit();
    });

    EventHelpers.safeListen("ui:preset:select", async ({ preset, isModification }) => {
      let finalPrompt = preset.prompt;

      if (isModification && this.editor) {
        const currentCode = this.editor.getValue().trim();
        finalPrompt = `${preset.prompt}

Current diagram:
\`\`\`mermaid
${currentCode}
\`\`\`

Please provide the modified Mermaid diagram code.`;
      }

      this.elements.inputField.value = finalPrompt;
      await this.handleSubmit();
    });
  }

  /**
   * Handle AI prompt submission and generation
   */
  async handleSubmit(): Promise<void> {
    const { inputField } = this.elements;
    const prompt = inputField.value.trim();
    if (!prompt) return;

    try {
      this.startGeneration(prompt);
      const chat = await this.agentd.openChat();

      let reply = "";
      let shownCode = "";
      await chat.prompt(buildAgentPrompt(prompt, this.editor.getValue()), (piece) => {
        reply += piece;
        const code = extractMermaid(reply);
        if (code && code !== shownCode) {
          shownCode = code;
          this.editor.setValue(code);
        }
      });

      inputField.value = "";
      EventHelpers.safeEmit("ai:complete", { code: this.editor.getValue() });
    } catch (error) {
      this.handleGenerationError(error);
    } finally {
      this.finishGeneration();
    }
  }

  private startGeneration(prompt: string): void {
    EventHelpers.safeEmit("ai:start", { prompt });
    EventHelpers.safeEmit("app:loading", { isLoading: true });
    this.setLoadingState(true);
  }

  private handleGenerationError(error: unknown): void {
    console.error("Error processing prompt:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to process prompt with AI. Check that agentd is running";

    EventHelpers.safeEmit("ai:error", { error: errorMessage });
  }

  private finishGeneration(): void {
    this.setLoadingState(false);
    EventHelpers.safeEmit("app:loading", { isLoading: false });
  }

  private setLoadingState(loading: boolean): void {
    const { inputField, inputArea, generationStatus } = this.elements;

    this.editor.updateOptions({ readOnly: loading });
    inputField.disabled = loading;
    inputArea.style.display = loading ? "none" : "flex";
    generationStatus.style.display = loading ? "block" : "none";
    generationStatus.textContent = loading ? "Generating…" : "";
    inputField.style.opacity = loading ? "0.5" : "1";

    if (loading) {
      EventHelpers.safeEmit("ai:progress", { status: "Generating…" });
    }
  }
}
