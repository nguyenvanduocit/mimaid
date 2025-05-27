import Anthropic from "@anthropic-ai/sdk";
import { AI_CONFIG } from "./config";
import * as monaco from "monaco-editor";

export class AIHandler {
  private client: Anthropic;
  private editor: monaco.editor.IStandaloneCodeEditor;
  private elements: {
    inputField: HTMLTextAreaElement;
    inputArea: HTMLDivElement;
    generationStatus: HTMLSpanElement;
  };

  constructor(
    editor: monaco.editor.IStandaloneCodeEditor,
    elements: {
      inputField: HTMLTextAreaElement;
      inputArea: HTMLDivElement;
      generationStatus: HTMLSpanElement;
    }
  ) {
    this.editor = editor;
    this.elements = elements;
    this.client = new Anthropic({
      apiKey: AI_CONFIG.apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async handleSubmit(): Promise<void> {
    const { inputField, inputArea, generationStatus } = this.elements;
    let prompt = inputField.value.trim();
    if (!prompt) return;

    try {
      this.setLoadingState(true);
      const currentCode = this.editor.getValue();
      
      if (currentCode) {
        prompt = `Given this Mermaid diagram:\n\n${currentCode}\n\n${prompt}`;
      }

      const stream = await this.client.messages.create({
        max_tokens: AI_CONFIG.maxTokens,
        system: "You are a helpful assistant that can help me go create or edit the Mermaid diagram code. wrap the code in ```mermaid tags. Think step by step before responding.",
        messages: [{ role: "user", content: prompt }],
        model: AI_CONFIG.model,
        temperature: AI_CONFIG.temperature,
        stream: true,
        thinking: {
          type: AI_CONFIG.thinking.type,
          budget_tokens: AI_CONFIG.thinking.budgetTokens,
        },
      });

      await this.handleStream(stream);
      inputField.value = "";
    } catch (error) {
      console.error("Error processing prompt:", error);
      generationStatus.style.display = "block";
      generationStatus.textContent = "❌ Failed to process prompt with AI. Check your API key";
      setTimeout(() => {
        generationStatus.style.display = "none";
      }, 5000);
    } finally {
      this.setLoadingState(false);
    }
  }

  private async handleStream(stream: AsyncIterable<any>): Promise<void> {
    let isInsideCodeBlock = false;
    let accumulatedCode = "";
    let tempResponse = "";

    for await (const messageStreamEvent of stream) {
      if (messageStreamEvent.type === "content_block_delta") {
        const chunk = "text" in messageStreamEvent.delta ? messageStreamEvent.delta.text : "";
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
  }

  private setLoadingState(loading: boolean): void {
    const { inputField, inputArea, generationStatus } = this.elements;
    
    this.editor.updateOptions({ readOnly: loading });
    inputField.disabled = loading;
    inputArea.style.display = loading ? "none" : "block";
    generationStatus.style.display = loading ? "block" : "none";
    generationStatus.textContent = loading ? "AI is generating..." : "";
    inputField.style.opacity = loading ? "0.5" : "1";
  }
} 