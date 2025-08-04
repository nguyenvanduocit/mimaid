import { EditorConfig, AIConfig } from './types';

/**
 * Configuration for editor functionality and constraints
 */
export const EDITOR_CONFIG: EditorConfig = {
  minScale: 0.5,
  maxScale: 20,
  minWidth: 20,
  zoomFactor: 0.1,
};

/**
 * Configuration for AI integration and generation parameters
 */
export const AI_CONFIG: AIConfig = {
  apiKey: localStorage.getItem('googleAiApiKey') || import.meta.env.VITE_GOOGLE_AI_API_KEY,
  model: 'gemini-2.5-pro',
  temperature: 1,
  maxTokens: 64000,
  thinkingBudget: -1, // Unlimited thinking budget
  enableGrounding: true, // Enable Google Search grounding by default
  enableUrlContext: true, // Enable URL context analysis by default
  dynamicRetrievalThreshold: 0.3, // Control when grounding is used (0.0-1.0)
};

/**
 * Configuration for Mermaid diagram rendering
 */
export const MERMAID_CONFIG = {
  startOnLoad: false,
};

/**
 * Configuration for Monaco Editor settings and features
 */
export const MONACO_CONFIG = {
  language: 'mermaid',
  theme: 'mermaid',
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  glyphMargin: true, // Enable glyph margin for error indicators
  folding: false, // Disable folding to keep it simple
  lineNumbers: 'on',
  lineNumbersMinChars: 3,
  lineDecorationsWidth: 10,
  renderLineHighlight: 'all',
};

/**
 * Preset prompts for creating new diagrams from scratch
 */
export const CREATION_PRESETS = [
  {
    title: "Flowchart",
    prompt: "Create a flowchart diagram showing the process of user authentication with login, password validation, and success/failure paths"
  },
  {
    title: "Sequence Diagram", 
    prompt: "Create a sequence diagram showing the interaction between a client, server, and database for a simple API request"
  },
  {
    title: "Class Diagram",
    prompt: "Create a class diagram for a simple e-commerce system with User, Product, Order, and Payment classes"
  },
  {
    title: "Gantt Chart",
    prompt: "Create a Gantt chart for a 2-month software development project with planning, development, testing, and deployment phases"
  },
  {
    title: "Entity Relationship",
    prompt: "Create an entity relationship diagram for a blog system with users, posts, comments, and categories"
  },
  {
    title: "Git Graph",
    prompt: "Create a git graph showing a feature branch workflow with main branch, feature branch, and merge commits"
  },
  {
    title: "State Diagram",
    prompt: "Create a state diagram for a simple order processing system with states like pending, processing, shipped, and delivered"
  },
  {
    title: "Pie Chart",
    prompt: "Create a pie chart showing the distribution of programming languages used in a development team"
  }
];

/**
 * Preset prompts for modifying existing diagrams
 */
export const MODIFICATION_PRESETS = [
  {
    title: "Simplify",
    prompt: "Make this diagram simpler and more readable by removing unnecessary details and focusing on the core elements"
  },
  {
    title: "Add Details",
    prompt: "Make this diagram more detailed and comprehensive by adding more elements, properties, and relationships"
  },
  {
    title: "Improve Layout",
    prompt: "Improve the layout and visual organization of this diagram to make it clearer and more professional"
  },
  {
    title: "Group Elements",
    prompt: "Group related elements in this diagram using subgraphs, containers, or sections to better organize the content"
  },
  {
    title: "Add Colors & Styling",
    prompt: "Add colors, styling, and visual enhancements to make this diagram more visually appealing and easier to understand"
  },
  {
    title: "Convert to Flowchart",
    prompt: "Convert this diagram to a flowchart format while preserving the main logic and relationships"
  },
  {
    title: "Convert to Sequence",
    prompt: "Convert this diagram to a sequence diagram format showing the interactions over time"
  },
  {
    title: "Fix & Optimize",
    prompt: "Fix any syntax errors and optimize this diagram for better readability and correctness"
  }
]; 