import { createModelContent, createUserContent, GenerateContentParameters, GenerateContentResponse, GoogleGenAI } from "@google/genai";
import { AI_CONFIG } from "./config";

export class AIHandler {
  private client: GoogleGenAI;
  private editor: any; // Use any since we're dynamically importing Monaco
  private previousPrompt: string;
  private elements: {
    inputField: HTMLTextAreaElement;
    inputArea: HTMLDivElement;
    generationStatus: HTMLSpanElement;
  };

  constructor(
    editor: any, // Use any since we're dynamically importing Monaco
    elements: {
      inputField: HTMLTextAreaElement;
      inputArea: HTMLDivElement;
      generationStatus: HTMLSpanElement;
    }
  ) {
    this.editor = editor;
    this.elements = elements;
    this.client = new GoogleGenAI({apiKey: AI_CONFIG.apiKey});
    this.previousPrompt = "";
  }

  async handleSubmit(): Promise<void> {
    const { inputField, generationStatus } = this.elements;
    let prompt = inputField.value.trim();
    if (!prompt) return;

    try {
      this.setLoadingState(true);
      const currentCode = this.editor.getValue();

      const systemPrompt = "You are a helpful assistant that can help me go create or edit the Mermaid diagram code. ALWAYS wrap the code in ```mermaid tags. Think step by step before responding.";
      
      let contents = [
        createUserContent([
          systemPrompt
        ]),
        createModelContent("Yes, i will create mermaid diagram code for you. Please provide me with the prompt.")
      ]
      
      if (this.previousPrompt) {
        contents.push(createUserContent([
          this.previousPrompt
        ]))
      }

      if (currentCode) {
        contents.push(createModelContent(currentCode))
      }

      contents.push(createUserContent([
        prompt
      ]))

      const parts: GenerateContentParameters = {
        model: AI_CONFIG.model,
        contents: contents,
        config: {
          tools: [{urlContext: {}}, {googleSearch: {}}],
          temperature: AI_CONFIG.temperature,
          maxOutputTokens: AI_CONFIG.maxTokens
        },
      }


      const result = await this.client.models.generateContentStream(parts);

      await this.handleStream(result);
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

    this.previousPrompt = prompt;
  }

  private async handleStream(stream: AsyncGenerator<GenerateContentResponse, any, any>): Promise<void> {
    let isInsideCodeBlock = false;
    let accumulatedCode = "";
    let tempResponse = "";

    for await (const chunk of stream) {
      if (chunk.text) {
        tempResponse += chunk.text;
        
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
          accumulatedCode += chunk.text;
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