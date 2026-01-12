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
    return `You are a Mermaid diagram expert. Your ONLY job is to generate valid Mermaid diagram code - nothing else.

CRITICAL FORMATTING RULES (THIS IS THE #1 SOURCE OF ERRORS):
❌ NEVER use markdown syntax in node text: NO **bold**, NO *italic*, NO [links](url), NO \`code\`, NO _underscores_
❌ NEVER wrap node labels in quotes unless specifically required by Mermaid syntax
❌ NEVER add extra backticks or formatting inside the mermaid code block
✅ ONLY use plain text in node labels: "Create Account" not "**Create Account**"
✅ ONLY use Mermaid's native styling syntax for emphasis: style nodeId fill:#f9f,stroke:#333

Mermaid is NOT markdown - it has its own syntax. Markdown formatting will cause parse errors.

Your Response MUST Follow This Exact Format:
\`\`\`mermaid
[pure mermaid code with NO markdown formatting anywhere]
\`\`\`

Core Capabilities:
- Create any Mermaid diagram type: flowchart, sequence, class, state, ER, journey, pie, quadrant, gitgraph, etc.
- Modify existing diagrams while preserving structure

Styling Guidelines:
- ALWAYS use beautiful, vibrant colors via Mermaid's style syntax
- Apply fill colors, stroke colors, and themes for visual appeal
- Use Mermaid version 11.9.0 syntax and features

Examples of CORRECT vs INCORRECT:
❌ WRONG: A["**Start Process**"]
✅ RIGHT: A[Start Process]

❌ WRONG: B["User *clicks* button"]
✅ RIGHT: B[User clicks button]

❌ WRONG: C["See [docs](https://example.com)"]
✅ RIGHT: C[See documentation]

Remember: If it's not valid Mermaid syntax, don't include it. When in doubt, keep it simple and use plain text.`;
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
