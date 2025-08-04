import { createModelContent, createUserContent, GenerateContentParameters, GenerateContentResponse, GoogleGenAI } from "@google/genai";
import { AI_CONFIG } from "./config";
import { GroundingMetadata } from "./types";
import { EventHelpers } from "./events";

export class AIHandler {
  private client: GoogleGenAI;
  private editor: any; // Use any since we're dynamically importing Monaco
  private previousPrompt: string;
  private elements: {
    inputField: HTMLTextAreaElement | HTMLInputElement;
    inputArea: HTMLDivElement;
    generationStatus: HTMLSpanElement;
  };
  private groundingMetadata: GroundingMetadata | null = null;

  constructor(
    editor: any, // Use any since we're dynamically importing Monaco
    elements: {
      inputField: HTMLTextAreaElement | HTMLInputElement;
      inputArea: HTMLDivElement;
      generationStatus: HTMLSpanElement;
    }
  ) {
    this.editor = editor;
    this.elements = elements;
    this.client = new GoogleGenAI({apiKey: AI_CONFIG.apiKey});
    this.previousPrompt = "";
    
    // Listen for UI events
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for input submissions
    EventHelpers.safeListen('ui:input:submit', async ({ prompt }) => {
      this.elements.inputField.value = prompt;
      await this.handleSubmit();
    });

    // Listen for preset selections
    EventHelpers.safeListen('ui:preset:select', async ({ preset, isModification }) => {
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

  async handleSubmit(): Promise<void> {
    const { inputField, generationStatus } = this.elements;
    let prompt = inputField.value.trim();
    if (!prompt) return;

    try {
      // Emit AI start event
      EventHelpers.safeEmit('ai:start', { prompt });
      EventHelpers.safeEmit('app:loading', { isLoading: true });
      
      this.setLoadingState(true);
      const currentCode = this.editor.getValue();

      const systematicPrompt = `You are a Mermaid diagram expert with access to real-time information and web content analysis. Your role is to create, modify, or improve Mermaid diagram code based on user requests.

Core Capabilities:
- Create any type of Mermaid diagram: flowcharts, sequence, class, state, ER, journey, pie, quadrant, gitgraph, etc.
- Access current best practices and latest Mermaid documentation through web search
- Analyze URLs provided by users to extract diagram-worthy information
- Research real-world examples and industry standards for accurate diagram creation

Critical Guidelines:
- Always respond with valid Mermaid syntax wrapped in \`\`\`mermaid code blocks
- NEVER use markdown formatting (bold, italic, links, etc.) inside diagram nodes or labels - Mermaid does not support markdown
- ALWAYS use beautiful, vibrant colors in your diagrams - apply color themes, fill colors, and styling
- Use descriptive node labels and clear connections based on real-world context
- Follow the latest Mermaid best practices for readability and maintainability

Styling Requirements:
- Always include color styling using classDef or fill attributes
- Use beautiful color palettes: blues (#4A90E2, #7BB3F0), greens (#7ED321, #50C878), oranges (#F5A623, #FF8C42), purples (#9013FE, #BD10E0), etc.
- Apply themes to make diagrams visually appealing and professional
- Use different colors to distinguish between different types of nodes or sections

Content Guidelines:
- When users mention URLs, analyze them to extract relevant structural information
- For requests about current technologies, standards, or methodologies, use web search to ensure accuracy
- When modifying existing code, preserve the overall structure unless specifically asked to change it

Enhanced Capabilities:
- If users ask about specific companies, products, or workflows, search for accurate organizational structures
- For technical architecture diagrams, reference current industry patterns and standards
- When creating process flows, verify against real-world implementations when possible
- For data models, check current database design patterns and conventions

Response format:
\`\`\`mermaid
[your mermaid code here with beautiful colors and NO markdown formatting]
\`\`\`

If you need more context or current information to create an accurate diagram, I'll search for it automatically.`;
      
      let contents = [
        createUserContent([
          systematicPrompt
        ]),
        createModelContent("I understand. I'm ready to help you create or modify Mermaid diagrams. I'll provide valid Mermaid syntax in code blocks based on your requirements.")
      ]
      
      if (this.previousPrompt) {
        contents.push(createUserContent([
          this.previousPrompt
        ]))
      }

      if (currentCode) {
        contents.push(createUserContent([
          `Current diagram code:\n\`\`\`mermaid\n${currentCode}\n\`\`\``
        ]))
        contents.push(createModelContent("I can see the current diagram. How would you like me to modify it?"))
      }

      contents.push(createUserContent([
        prompt
      ]))

      // Build tools array based on configuration
      const tools: any[] = [];

      if (AI_CONFIG.enableUrlContext) {
        tools.push({ urlContext: {} });
      }

      if (AI_CONFIG.enableGrounding) {
        tools.push({ googleSearch: {} });
      }

      const parts: GenerateContentParameters = {
        model: AI_CONFIG.model,
        contents: contents,
        config: {
          ...(tools.length > 0 && { tools }),
          ...(AI_CONFIG.enableGrounding && AI_CONFIG.dynamicRetrievalThreshold && {
            dynamicRetrieval: {
              threshold: AI_CONFIG.dynamicRetrievalThreshold
            }
          }),
          temperature: AI_CONFIG.temperature,
          maxOutputTokens: AI_CONFIG.maxTokens,
          thinkingConfig: {
            thinkingBudget: AI_CONFIG.thinkingBudget || -1
          }
        },
      }


      const result = await this.client.models.generateContentStream(parts);

      await this.handleStream(result);
      inputField.value = "";
      
      // Emit completion event
      EventHelpers.safeEmit('ai:complete', { code: this.editor.getValue() });
    } catch (error) {
      console.error("Error processing prompt:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to process prompt with AI. Check your API key";
      
      EventHelpers.safeEmit('ai:error', { error: errorMessage });
      
      generationStatus.style.display = "block";
      generationStatus.textContent = `❌ ${errorMessage}`;
      setTimeout(() => {
        generationStatus.style.display = "none";
      }, 5000);
    } finally {
      this.setLoadingState(false);
      EventHelpers.safeEmit('app:loading', { isLoading: false });
    }

    this.previousPrompt = prompt;
  }

  private async handleStream(stream: AsyncGenerator<GenerateContentResponse, any, any>): Promise<void> {
    let isInsideCodeBlock = false;
    let accumulatedCode = "";
    let tempResponse = "";

    for await (const chunk of stream) {
      // Capture grounding metadata if available (check if it exists on the chunk)
      if ('groundingMetadata' in chunk && chunk.groundingMetadata) {
        this.groundingMetadata = chunk.groundingMetadata as GroundingMetadata;
        this.displayGroundingInfo(this.groundingMetadata);
        EventHelpers.safeEmit('ai:grounding', { metadata: this.groundingMetadata });
      }

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
    inputArea.style.display = loading ? "none" : "flex";
    generationStatus.style.display = loading ? "block" : "none";
    generationStatus.textContent = loading ? "AI is generating..." : "";
    inputField.style.opacity = loading ? "0.5" : "1";
    
    // Emit progress event
    if (loading) {
      EventHelpers.safeEmit('ai:progress', { status: 'AI is generating...' });
    }
  }

  private displayGroundingInfo(metadata: GroundingMetadata): void {

    // Update status to show grounding was used  
    if (metadata.webSearchQueries?.length || metadata.groundingSources?.length) {
      const { generationStatus } = this.elements;
      const status = "✨ AI is generating with real-time information...";
      generationStatus.textContent = status;
      EventHelpers.safeEmit('ai:progress', { status });
    }
  }

  public getGroundingMetadata(): GroundingMetadata | null {
    return this.groundingMetadata;
  }

  public hasGroundingSources(): boolean {
    return !!(this.groundingMetadata?.groundingSources?.length || this.groundingMetadata?.webSearchQueries?.length);
  }

  public getSourceUrls(): string[] {
    return this.groundingMetadata?.groundingSources?.map(source => source.uri) || [];
  }

  public updateGroundingSettings(_enableGrounding: boolean, _enableUrlContext: boolean, _threshold?: number): void {
    // This would typically update AI_CONFIG or a local configuration
    // Implementation would go here when needed
  }
} 