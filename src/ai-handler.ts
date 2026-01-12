import { streamText, LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { AI_CONFIG } from "./config";
import { AIProviderType } from "./types";
import { EventHelpers } from "./events";

/**
 * Get the AI model instance based on provider configuration
 */
function getModel(provider: AIProviderType, apiKey: string, modelId: string): LanguageModel {
  switch (provider) {
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelId);
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
  }
}

/**
 * Handles AI-powered diagram generation using multiple providers via Vercel AI SDK
 */
export class AIHandler {
  private editor: any;
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
  ) {
    this.editor = editor;
    this.elements = elements;
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
      const currentCode = this.editor.getValue();
      const messages = this.buildMessages(prompt, currentCode);

      const model = getModel(AI_CONFIG.provider, AI_CONFIG.apiKey, AI_CONFIG.model);

      const result = streamText({
        model,
        system: this.getSystemPrompt(),
        messages,
        temperature: AI_CONFIG.temperature,
      });

      await this.handleStream(result);

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

  /**
   * Build messages array for AI SDK
   */
  private buildMessages(
    prompt: string,
    currentCode: string,
  ): Array<{ role: "user" | "assistant"; content: string }> {
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    if (currentCode) {
      messages.push({
        role: "user",
        content: `Current diagram code:\n\`\`\`mermaid\n${currentCode}\n\`\`\``,
      });
      messages.push({
        role: "assistant",
        content: "I can see the current diagram. How would you like me to modify it?",
      });
    }

    messages.push({ role: "user", content: prompt });
    return messages;
  }

  private getSystemPrompt(): string {
    return `You are a Mermaid diagram expert. Generate valid Mermaid v11 code only.

🚨 CRITICAL - NO MARKDOWN IN MERMAID (THIS CAUSES 90% OF ERRORS):
Mermaid is NOT markdown. These will BREAK your diagram:
❌ **bold** - NEVER use double asterisks
❌ *italic* - NEVER use single asterisks
❌ _underscore_ - NEVER use underscores for emphasis
❌ [link](url) - NEVER use markdown links
❌ \`code\` - NEVER use backticks inside labels
❌ # headers - NEVER use hash headers

✅ CORRECT: A[User clicks button]
❌ WRONG: A[User **clicks** button]
❌ WRONG: A[User _clicks_ button]
❌ WRONG: A[See [docs](url)]

USE MERMAID v11 SYNTAX:
- Use \`flowchart\` NOT \`graph\`
- Use shape syntax: \`A@{ shape: diamond, label: "Decision" }\`
- Shapes: rect, rounded, stadium, diamond, hex, cyl, doc, docs, delay, trap-t, trap-b, fork, cloud, odd

STYLING (use these instead of markdown):
- Colors: style A fill:#4CAF50,stroke:#2E7D32
- Classes: classDef highlight fill:#ff0,stroke:#333

Response format:
\`\`\`mermaid
flowchart TD
    A[Plain text only] --> B[No markdown]
\`\`\`

FINAL CHECK: Before outputting, scan for **, *, _, [], \`\` - if found, REMOVE them.`;
  }

  private handleGenerationError(error: unknown): void {
    console.error("Error processing prompt:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to process prompt with AI. Check your API key";

    EventHelpers.safeEmit("ai:error", { error: errorMessage });
  }

  private finishGeneration(): void {
    this.setLoadingState(false);
    EventHelpers.safeEmit("app:loading", { isLoading: false });
  }

  private async handleStream(result: ReturnType<typeof streamText>): Promise<void> {
    let isInsideCodeBlock = false;
    let accumulatedCode = "";
    let tempResponse = "";

    for await (const chunk of result.textStream) {
      tempResponse += chunk;

      const mermaidMatch = tempResponse.match(/```mermaid\n([\s\S]*?)```/);
      if (mermaidMatch) {
        isInsideCodeBlock = true;
        accumulatedCode = mermaidMatch[1].trim();
        this.editor.setValue(accumulatedCode);
        continue;
      }

      if (tempResponse.includes("```") && isInsideCodeBlock) {
        isInsideCodeBlock = false;
        accumulatedCode += tempResponse.replace("```", "");
        this.editor.setValue(accumulatedCode);
        break;
      }

      if (isInsideCodeBlock) {
        accumulatedCode += chunk;
        this.editor.setValue(accumulatedCode);
      }
    }
  }

  private setLoadingState(loading: boolean): void {
    const { inputField, inputArea, generationStatus } = this.elements;

    this.editor.updateOptions({ readOnly: loading });
    inputField.disabled = loading;
    inputArea.style.display = loading ? "none" : "flex";
    generationStatus.style.display = loading ? "block" : "none";
    generationStatus.textContent = loading ? "AI is generating..." : "";
    inputField.style.opacity = loading ? "0.5" : "1";

    if (loading) {
      EventHelpers.safeEmit("ai:progress", { status: "AI is generating..." });
    }
  }
}
