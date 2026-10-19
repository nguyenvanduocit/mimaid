import { MermaidLineState, tokenizeMermaidLine } from "./mermaid-tokens";
import { keywords, requirementDiagrams } from "./mermaid-keywords";

// Register Mermaid language configuration
export const configureMermaidLanguage = (monaco: any) => {
  monaco.languages.register({ id: "mermaid" });

  // Highlighting comes from pele's tokenizer (see mermaid-highlight.ts and mermaid-tokens.ts)
  monaco.languages.setTokensProvider("mermaid", {
    getInitialState: () => new MermaidLineState(),
    tokenize: tokenizeMermaidLine,
  });

  // Define themes - Flexoki light and dark palettes (match the panel tokens in style.css)
  monaco.editor.defineTheme("mermaid", {
    base: "vs",
    inherit: true,
    colors: {
      "editor.background": "#fffcf0",
      "editor.foreground": "#100f0f",
      "editor.lineHighlightBackground": "#f2f0e580",
      "editor.selectionBackground": "#cecdc380",
      "editor.inactiveSelectionBackground": "#e6e4d9",
      "editorCursor.foreground": "#100f0f",
      "editorLineNumber.foreground": "#b7b5ac",
      "editorLineNumber.activeForeground": "#6f6e69",
      "editorIndentGuide.background1": "#e6e4d9",
      "editorIndentGuide.activeBackground1": "#cecdc3",
      "editorBracketMatch.background": "#cecdc340",
      "editorBracketMatch.border": "#b7b5ac",
    },
    rules: [
      { token: "syn-punctuation", foreground: "6f6e69" },
      { token: "syn-language", foreground: "a02f6f" },
      { token: "syn-selector", foreground: "a02f6f" },
      { token: "syn-type", foreground: "ad8301" },
      { token: "syn-constant", foreground: "ad8301" },
      { token: "syn-keyword", foreground: "66800b" },
      { token: "syn-variable", foreground: "205ea6" },
      { token: "syn-yaml-key", foreground: "205ea6" },
      { token: "syn-function", foreground: "bc5215" },
      { token: "syn-string", foreground: "24837b" },
      { token: "syn-number", foreground: "5e409d" },
      { token: "syn-comment", foreground: "878580" },
    ],
  });

  monaco.editor.defineTheme("mermaid-dark", {
    base: "vs-dark",
    inherit: true,
    colors: {
      "editor.background": "#1c1b1a",
      "editor.foreground": "#cecdc3",
      "editor.lineHighlightBackground": "#282726",
      "editor.selectionBackground": "#403e3c",
      "editor.inactiveSelectionBackground": "#343331",
      "editorCursor.foreground": "#cecdc3",
      "editorLineNumber.foreground": "#575653",
      "editorLineNumber.activeForeground": "#878580",
      "editorIndentGuide.background1": "#282726",
      "editorIndentGuide.activeBackground1": "#403e3c",
      "editorBracketMatch.background": "#403e3c80",
      "editorBracketMatch.border": "#575653",
    },
    rules: [
      { token: "syn-punctuation", foreground: "878580" },
      { token: "syn-language", foreground: "ce5d97" },
      { token: "syn-selector", foreground: "ce5d97" },
      { token: "syn-type", foreground: "d0a215" },
      { token: "syn-constant", foreground: "d0a215" },
      { token: "syn-keyword", foreground: "879a39" },
      { token: "syn-variable", foreground: "4385be" },
      { token: "syn-yaml-key", foreground: "4385be" },
      { token: "syn-function", foreground: "da702c" },
      { token: "syn-string", foreground: "3aa99f" },
      { token: "syn-number", foreground: "8b7ec8" },
      { token: "syn-comment", foreground: "6f6e69" },
    ],
  });

  // Register completion provider
  monaco.languages.registerCompletionItemProvider("mermaid", {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = [
        {
          label: "loop",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["loop ${1:Loop text}", "\t$0", "end"].join("\n"),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Sequence Diagram Loops",
        },
        {
          label: "alt",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["alt ${1:Describing text}", "\t$0", "else", "\t", "end"].join("\n"),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Alternative Path",
        },
        {
          label: "opt",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["opt ${1:Describing text}", "\t$0", "end"].join("\n"),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Optional Path",
        },
        {
          label: "par",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            "par ${1:[Action 1]}",
            "\t$0",
            "and ${2:[Action 2]}",
            "\t",
            "and ${3:[Action 3]}",
            "\t",
            "end",
          ].join("\n"),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Parallel Actions",
        },
        {
          label: "rect",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["rect ${1:rgb(0, 255, 0)}", "\t$0", "end"].join("\n"),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Background Color",
        },
        {
          label: "subgraph",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["subgraph ${1:title}", "\t$0", "end"].join("\n"),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Subgraph",
        },
        {
          label: "class",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["class ${1:className} {", "\t$0", "}"].join("\n"),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Class",
        },
        {
          label: "state",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["state ${1:stateName} {", "\t$0", "}"].join("\n"),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "State",
        },
        {
          label: "note",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["note ${1:right of State1}", "\t$0", "end note"].join("\n"),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "State",
        },
        {
          label: "section",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["section ${1:Go to work}", "\t$0"].join("\n"),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "User-journey Section",
        },
        {
          label: "element",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["element ${1:test_entity} {", "\t$0", "}"].join("\n"),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Requirement Diagram Element",
        },
        {
          label: "options",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["options", "{", "    $0", "}", "end"].join("\n"),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Git Graph Options",
        },
        ...keywords.c4Diagram.blockKeywords.map((containerType) => ({
          label: containerType,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [containerType + ' (${1:boundary_id}, "New Boundary") {', "    $0", "}"].join(
            "\n",
          ),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "C4 Diagram " + containerType + " Boundary",
        })),
        ...requirementDiagrams.map((requirementDiagramType) => ({
          label: requirementDiagramType,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            requirementDiagramType + " ${1:test_req} {",
            "\tid: 1",
            "\ttext: the test text.",
            "\trisk: high",
            "\tverifyMethod: test",
            "}",
          ].join("\n"),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: requirementDiagramType
            .split(/(?=[A-Z])/)
            .map((part) => part[0].toUpperCase() + part.slice(1))
            .join(" "),
        })),
        ...[
          ...new Set(
            Object.values(keywords)
              .map((diagramKeywords) =>
                Object.entries(diagramKeywords)
                  .filter((keywordType) => keywordType[0] !== "annotations")
                  .map((entry) => entry[1]),
              )
              .flat(2),
          ),
        ].map((keyword) => ({
          label: keyword,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: keyword,
        })),
      ];

      return {
        suggestions: suggestions.map((suggestion) => ({
          ...suggestion,
          range,
        })),
      };
    },
  });

  // Set language configuration
  monaco.languages.setLanguageConfiguration("mermaid", {
    autoClosingPairs: [
      { open: "(", close: ")" },
      { open: "{", close: "}" },
      { open: "[", close: "]" },
    ],
    brackets: [
      ["(", ")"],
      ["{", "}"],
      ["[", "]"],
    ],
    comments: {
      lineComment: "%%",
    },
  });
};
