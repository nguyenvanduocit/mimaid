// Register Mermaid language configuration
export const configureMermaidLanguage = (monaco: any) => {
  const requirementDiagrams = [
    "requirement",
    "functionalRequirement",
    "interfaceRequirement",
    "performanceRequirement",
    "physicalRequirement",
    "designConstraint",
  ];

  // Enhanced keywords with more comprehensive coverage
  const keywords = {
    timeline: {
      typeKeywords: ["timeline"],
      blockKeywords: ["section"],
      keywords: ["title"],
    },
    mindmap: {
      typeKeywords: ["mindmap"],
      blockKeywords: [],
      keywords: [
        "square",
        "square_box",
        "round",
        "circle",
        "cloud",
        "bang",
        "hexagon",
        "default",
      ],
    },
    flowchart: {
      typeKeywords: ["flowchart", "flowchart-v2", "graph"],
      blockKeywords: ["subgraph", "end"],
      keywords: [
        "TB", "TD", "BT", "RL", "LR",
        "click", "call", "href",
        "_self", "_blank", "_parent", "_top",
        "linkStyle", "style", "classDef", "class",
        "direction", "interpolate",
        // Enhanced with more flowchart keywords
        "fill", "stroke", "stroke-width", "stroke-dasharray",
        "color", "background", "border", "border-radius",
        "font-size", "font-family", "font-weight",
      ],
    },
    sequenceDiagram: {
      typeKeywords: ["sequenceDiagram"],
      blockKeywords: [
        "alt", "par", "and", "loop", "else", "end", 
        "rect", "opt", "break", "critical", "ignore",
      ],
      keywords: [
        "participant", "actor", "as",
        "Note", "note", "right of", "left of", "over",
        "activate", "deactivate", "destroy",
        "autonumber", "title", "accDescription",
        "link", "links", "properties",
        // Enhanced sequence diagram keywords
        "box", "rgba", "rgb", "transparent",
      ],
    },
    classDiagram: {
      typeKeywords: ["classDiagram", "classDiagram-v2"],
      blockKeywords: ["class", "namespace"],
      keywords: [
        "link", "click", "callback", "call", "href",
        "cssClass", "direction", "TB", "BT", "RL", "LR",
        "title", "accDescription", "order",
        // Enhanced class diagram keywords
        "interface", "abstract", "enum", "annotation",
        "public", "private", "protected", "internal",
        "static", "final", "abstract",
      ],
    },
    stateDiagram: {
      typeKeywords: ["stateDiagram", "stateDiagram-v2"],
      blockKeywords: ["state", "note", "end"],
      keywords: [
        "state", "as", "hide empty description",
        "direction", "TB", "BT", "RL", "LR",
        // Enhanced state diagram keywords
        "fork", "join", "choice", "concurrent",
      ],
    },
    erDiagram: {
      typeKeywords: ["erDiagram"],
      blockKeywords: [],
      keywords: [
        "title", "accDescription",
        // Enhanced ER diagram keywords
        "PK", "FK", "UK", "int", "string", "varchar", "char",
        "date", "datetime", "boolean", "decimal", "float",
        "one", "zero-or-one", "one-or-more", "zero-or-more",
      ],
    },
    journey: {
      typeKeywords: ["journey"],
      blockKeywords: ["section"],
      keywords: ["title"],
    },
    info: {
      typeKeywords: ["info"],
      blockKeywords: [],
      keywords: ["showInfo"],
    },
    gantt: {
      typeKeywords: ["gantt"],
      blockKeywords: [],
      keywords: [
        "title", "dateFormat", "axisFormat", "todayMarker",
        "section", "excludes", "inclusiveEndDates",
        // Enhanced Gantt keywords
        "weekday", "monday", "tuesday", "wednesday", "thursday",
        "friday", "saturday", "sunday",
        "done", "active", "milestone", "crit",
      ],
    },
    requirementDiagram: {
      typeKeywords: ["requirement", "requirementDiagram"],
      blockKeywords: requirementDiagrams.concat("element"),
      keywords: [
        // Enhanced requirement diagram keywords
        "id", "text", "risk", "verifymethod", "type",
        "low", "medium", "high", "analysis", "test", "inspection", "demonstration",
      ],
    },
    gitGraph: {
      typeKeywords: ["gitGraph"],
      blockKeywords: [],
      keywords: [
        "accTitle", "accDescr", "commit", "cherry-pick",
        "branch", "merge", "reset", "checkout",
        "LR", "BT", "id", "msg", "type", "tag",
        "NORMAL", "REVERSE", "HIGHLIGHT",
        // Enhanced git graph keywords
        "theme", "base", "primaryColor", "primaryTextColor",
        "primaryBorderColor", "lineColor", "order",
      ],
    },
    pie: {
      typeKeywords: ["pie"],
      blockKeywords: [],
      keywords: [
        "title", "showData", "accDescription",
        // Enhanced pie chart keywords
        "showValues", "textPosition",
      ],
    },
    c4Diagram: {
      typeKeywords: [
        "C4Context", "C4Container", "C4Component", "C4Dynamic", "C4Deployment",
      ],
      blockKeywords: [
        "Boundary", "Enterprise_Boundary", "System_Boundary", "Container_Boundary",
        "Node", "Node_L", "Node_R",
      ],
      keywords: [
        "title", "accDescription", "direction", "TB", "BT", "RL", "LR",
        "Person_Ext", "Person", "SystemQueue_Ext", "SystemDb_Ext", "System_Ext",
        "SystemQueue", "SystemDb", "System", "ContainerQueue_Ext", "ContainerDb_Ext",
        "Container_Ext", "ContainerQueue", "ContainerDb", "Container",
        "ComponentQueue_Ext", "ComponentDb_Ext", "Component_Ext",
        "ComponentQueue", "ComponentDb", "Component", "Deployment_Node",
        "Rel", "BiRel", "Rel_Up", "Rel_U", "Rel_Down", "Rel_D",
        "Rel_Left", "Rel_L", "Rel_Right", "Rel_R", "Rel_Back", "RelIndex",
        // Enhanced C4 diagram keywords
        "UpdateElementStyle", "UpdateRelStyle", "UpdateLayoutConfig",
        "SHOW_PERSON_PORTRAIT", "SHOW_PERSON_OUTLINE",
      ],
    },
    // New diagram types support
    quadrantChart: {
      typeKeywords: ["quadrantChart"],
      blockKeywords: [],
      keywords: [
        "title", "x-axis", "y-axis", "quadrant-1", "quadrant-2", "quadrant-3", "quadrant-4",
      ],
    },
    xychart: {
      typeKeywords: ["xychart-beta"],
      blockKeywords: [],
      keywords: [
        "title", "x-axis", "y-axis", "line", "bar",
      ],
    },
    sankey: {
      typeKeywords: ["sankey-beta"],
      blockKeywords: [],
      keywords: [
        "title", "accDescription",
      ],
    },
    architecture: {
      typeKeywords: ["architecture-beta"],
      blockKeywords: ["group"],
      keywords: [
        "title", "accDescription", "service", "junction", "left", "right", "top", "bottom",
      ],
    },
  };

  // Enhanced configuration directive handler with better error handling
  const configDirectiveHandler = [
    /^\s*%%(?={)/,
    {
      token: "config.directive",
      next: "@configDirective",
      nextEmbedded: "javascript",
    },
      ] as any;

  // Error handling patterns
  const errorPatterns = [
    [/^\s*%%\s*error/i, "custom-error"],
    [/^\s*%%\s*warning/i, "custom-warning"],
  ];

  // Register the language
  monaco.languages.register({ id: "mermaid" });

  // Set up monarch tokenizer
  monaco.languages.setMonarchTokensProvider("mermaid", {
    ...Object.entries(keywords)
      .map((entry) =>
        Object.fromEntries(
          Object.entries(entry[1]).map((deepEntry) => [
            entry[0] + deepEntry[0][0].toUpperCase() + deepEntry[0].slice(1),
            deepEntry[1],
          ])
        )
      )
      .reduce(
        (overallKeywords, nextKeyword) => ({
          ...overallKeywords,
          ...nextKeyword,
        }),
        {}
      ),
    tokenizer: {
      root: [
        // Enhanced error handling
        ...errorPatterns,
        
        // Enhanced diagram type detection with better regex patterns
        [/^\s*timeline\b/, "typeKeyword", "timeline"],
        [/^\s*mindmap\b/, "typeKeyword", "mindmap"],
        [/^\s*gitGraph\b/m, "typeKeyword", "gitGraph"],
        [/^\s*info\b/m, "typeKeyword", "info"],
        [/^\s*pie\b/m, "typeKeyword", "pie"],
        [/^\s*(flowchart|flowchart-v2|graph)\b/m, "typeKeyword", "flowchart"],
        [/^\s*sequenceDiagram\b/, "typeKeyword", "sequenceDiagram"],
        [/^\s*classDiagram(-v2)?\b/, "typeKeyword", "classDiagram"],
        [/^\s*journey\b/, "typeKeyword", "journey"],
        [/^\s*gantt\b/, "typeKeyword", "gantt"],
        [/^\s*stateDiagram(-v2)?\b/, "typeKeyword", "stateDiagram"],
        [/^\s*er(Diagram)?\b/, "typeKeyword", "erDiagram"],
        [/^\s*requirement(Diagram)?\b/, "typeKeyword", "requirementDiagram"],
        [/^\s*(C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)\b/m, "typeKeyword", "c4Diagram"],
        
        // New diagram types
        [/^\s*quadrantChart\b/, "typeKeyword", "quadrantChart"],
        [/^\s*xychart-beta\b/, "typeKeyword", "xychart"],
        [/^\s*sankey-beta\b/, "typeKeyword", "sankey"],
        [/^\s*architecture-beta\b/, "typeKeyword", "architecture"],
        
        configDirectiveHandler,
        
        // Enhanced comment patterns
        [/%%[^${].*$/, "comment"],
        [/^\s*#.*$/, "comment"], // Support for # comments in some contexts
      ],
      configDirective: [
        [/%%$/, { token: "config.directive", next: "@pop", nextEmbedded: "@pop" }],
      ],
      timeline: [
        configDirectiveHandler,
        [/(title)(.*)/, ["keyword", "string"]],
        [/(section)(.*)/, ["typeKeyword", "string"]],
        [/^\s*(\d+\s*(?:BC|AD|CE|BCE)?)\s*:/, ["number", "delimiter.bracket"]],
        [/^\s*:/, "delimiter.bracket"],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              "@timelineBlockKeywords": "typeKeyword",
              "@timelineKeywords": "keyword",
              "@default": "variable",
            },
          },
        ],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
      ],
      mindmap: [
        configDirectiveHandler,
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              "@mindmapBlockKeywords": "typeKeyword",
              "@mindmapKeywords": "keyword",
              "@default": "variable",
            },
          },
        ],
        [/::/, "transition"],
        [/[-+*]/, "delimiter.bracket"],
        [/".*?"/, "string"],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
      ],
      gitGraph: [
        configDirectiveHandler,
        [/option(?=s)/, { token: "typeKeyword", next: "optionsGitGraph" }],
        [
          /(accTitle|accDescr)(\s*:)(\s*[^\r\n]+$)/,
          ["keyword", "delimiter.bracket", "string"],
        ],
        [
          /(^\s*branch)(.*?)(\s+order)(:\s*)(\d+\s*$)/,
          ["keyword", "variable", "keyword", "delimiter.bracket", "number"],
        ],
        [/".*?"/, "string"],
        [
          /(^\s*)(branch|reset|merge|checkout)(\s*\S+)/m,
          ["delimiter.bracket", "keyword", "variable"],
        ],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              "@gitGraphBlockKeywords": "typeKeyword",
              "@gitGraphKeywords": "keyword",
            },
          },
        ],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
        [/\^/, "delimiter.bracket"],
      ],
      optionsGitGraph: [
        [
          /s$/,
          {
            token: "typeKeyword",
            nextEmbedded: "json",
          },
        ],
        ["end", { token: "typeKeyword", next: "@pop", nextEmbedded: "@pop" }],
      ],
      info: [
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              "@infoBlockKeywords": "typeKeyword",
              "@infoKeywords": "keyword",
            },
          },
        ],
      ],
      pie: [
        configDirectiveHandler,
        [/(title|accDescription)(.*$)/, ["keyword", "string"]],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              "@pieBlockKeywords": "typeKeyword",
              "@pieKeywords": "keyword",
            },
          },
        ],
        [/".*?"/, "string"],
        [/\s*\d+/, "number"],
        [/:/, "delimiter.bracket"],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
      ],
      flowchart: [
        configDirectiveHandler,
        [/[ox]?(--+|==+)[ox]/, "transition"],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              "@flowchartBlockKeywords": "typeKeyword",
              "@flowchartKeywords": "keyword",
              "@default": "variable",
            },
          },
        ],
        [/\|+.+?\|+/, "string"],
        [/\[+(\\.+?[\\/]|\/.+?[/\\])\]+/, "string"],
        [/[[>]+[^\]|[]+?\]+/, "string"],
        [/{+.+?}+/, "string"],
        [/\(+.+?\)+/, "string"],
        [/-\.+->?/, "transition"],
        [
          /(-[-.])([^->][^-]+?)(-{3,}|-{2,}>|\.-+>)/,
          ["transition", "string", "transition"],
        ],
        [/(==+)([^=]+?)(={3,}|={2,}>)/, ["transition", "string", "transition"]],
        [/<?(--+|==+)>|===+|---+/, "transition"],
        [/:::/, "transition"],
        [/[;&]/, "delimiter.bracket"],
        [/".*?"/, "string"],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
      ],
      sequenceDiagram: [
        configDirectiveHandler,
        [/(title:?|accDescription)([^\r\n;]*$)/, ["keyword", "string"]],
        [/(autonumber)([^\r\n\S]+off[^\r\n\S]*$)/, ["keyword", "keyword"]],
        [
          /(autonumber)([^\r\n\S]+\d+[^\r\n\S]+\d+[^\r\n\S]*$)/,
          ["keyword", "number"],
        ],
        [/(autonumber)([^\r\n\S]+\d+[^\r\n\S]*$)/, ["keyword", "number"]],
        [
          /(link\s+)(.*?)(:)(\s*.*?)(\s*@)(\s*[^\r\n;]+)/,
          [
            "keyword",
            "variable",
            "delimiter.bracket",
            "string",
            "delimiter.bracket",
            "string",
          ],
        ],
        [
          /((?:links|properties)\s+)([^\r\n:]*?)(:\s+)/,
          [
            { token: "keyword" },
            { token: "variable" },
            {
              token: "delimiter.bracket",
              nextEmbedded: "javascript",
              next: "@sequenceDiagramLinksProps",
            },
          ],
        ],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              "@sequenceDiagramBlockKeywords": "typeKeyword",
              "@sequenceDiagramKeywords": "keyword",
              "@default": "variable",
            },
          },
        ],
        [/(--?>?>|--?[)x])[+-]?/, "transition"],
        [/(:)([^:\n]*?$)/, ["delimiter.bracket", "string"]],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
      ],
      sequenceDiagramLinksProps: [
        [
          /$|;/,
          { nextEmbedded: "@pop", next: "@pop", token: "delimiter.bracket" },
        ],
      ],
      classDiagram: [
        configDirectiveHandler,
        [/(^\s*(?:title|accDescription))(\s+.*$)/, ["keyword", "string"]],
        [
          /(\*|<\|?|o|)(--|\.\.)(\*|\|?>|o|)([ \t]*[a-zA-Z]+[ \t]*)(:)(.*?$)/,
          [
            "transition",
            "transition",
            "transition",
            "variable",
            "delimiter.bracket",
            "string",
          ],
        ],
        [/(?!class\s)([a-zA-Z]+)(\s+[a-zA-Z]+)/, ["type", "variable"]],
        [/(\*|<\|?|o)?(--|\.\.)(\*|\|?>|o)?/, "transition"],
        [/^\s*class\s(?!.*\{)/, "keyword"],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              "@classDiagramBlockKeywords": "typeKeyword",
              "@classDiagramKeywords": "keyword",
              "@default": "variable",
            },
          },
        ],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
        [
          /(<<)(.+?)(>>)/,
          ["delimiter.bracket", "annotation", "delimiter.bracket"],
        ],
        [/".*?"/, "string"],
        [/:::/, "transition"],
        [/:|\+|-|#|~|\*\s*$|\$\s*$|\(|\)|{|}/, "delimiter.bracket"],
      ],
      journey: [
        configDirectiveHandler,
        [/(title)(.*)/, ["keyword", "string"]],
        [/(section)(.*)/, ["typeKeyword", "string"]],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              "@journeyBlockKeywords": "typeKeyword",
              "@journeyKeywords": "keyword",
              "@default": "variable",
            },
          },
        ],
        [
          /(^\s*.+?)(:)(.*?)(:)(.*?)([,$])/,
          [
            "string",
            "delimiter.bracket",
            "number",
            "delimiter.bracket",
            "variable",
            "delimiter.bracket",
          ],
        ],
        [/,/, "delimiter.bracket"],
        [/(^\s*.+?)(:)([^:]*?)$/, ["string", "delimiter.bracket", "variable"]],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
      ],
      gantt: [
        configDirectiveHandler,
        [/(title)(.*)/, ["keyword", "string"]],
        [/(section)(.*)/, ["typeKeyword", "string"]],
        [/^\s*([^:\n]*?)(:)/, ["string", "delimiter.bracket"]],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              "@ganttBlockKeywords": "typeKeyword",
              "@ganttKeywords": "keyword",
            },
          },
        ],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
        [/:/, "delimiter.bracket"],
      ],
      stateDiagram: [
        configDirectiveHandler,
        [/note[^:]*$/, { token: "typeKeyword", next: "stateDiagramNote" }],
        ["hide empty description", "keyword"],
        [/^\s*state\s(?!.*\{)/, "keyword"],
        [/(<<)(fork|join|choice)(>>)/, "annotation"],
        [
          /(\[\[)(fork|join|choice)(]])/,
          ["delimiter.bracket", "annotation", "delimiter.bracket"],
        ],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              "@stateDiagramBlockKeywords": "typeKeyword",
              "@stateDiagramKeywords": "keyword",
              "@default": "variable",
            },
          },
        ],
        [/".*?"/, "string"],
        [/(:)([^:\n]*?$)/, ["delimiter.bracket", "string"]],
        [/{|}/, "delimiter.bracket"],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
        [/-->/, "transition"],
        [/\[.*?]/, "string"],
      ],
      stateDiagramNote: [
        [/^\s*end note$/, { token: "typeKeyword", next: "@pop" }],
        [/.*/, "string"],
      ],
      erDiagram: [
        configDirectiveHandler,
        [/(title|accDescription)(.*$)/, ["keyword", "string"]],
        [/[}|][o|](--|\.\.)[o|][{|]/, "transition"],
        [/".*?"/, "string"],
        [/(:)(.*?$)/, ["delimiter.bracket", "string"]],
        [/:|{|}/, "delimiter.bracket"],
        [/([a-zA-Z]+)(\s+[a-zA-Z]+)/, ["type", "variable"]],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
        [/[a-zA-Z_-][\w$]*/, "variable"],
      ],
      requirementDiagram: [
        configDirectiveHandler,
        [/->|<-|-/, "transition"],
        [/(\d+\.)*\d+/, "number"],
        [
          /[a-zA-Z_-][\w$]*/,
          {
            cases: {
              "@requirementDiagramBlockKeywords": "typeKeyword",
              "@default": "variable",
            },
          },
        ],
        [/:|{|}|\//, "delimiter.bracket"],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
        [/".*?"/, "string"],
      ],
      c4Diagram: [
        configDirectiveHandler,
        [/(title|accDescription)(.*$)/, ["keyword", "string"]],
        [/\(/, { token: "delimiter.bracket", next: "c4DiagramParenthesis" }],
        [
          /[a-zA-Z_-][\w$]*/,
          {
            cases: {
              "@c4DiagramBlockKeywords": "typeKeyword",
              "@c4DiagramKeywords": "keyword",
              "@default": "variable",
            },
          },
        ],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
      ],
      c4DiagramParenthesis: [
        [/,/, "delimiter.bracket"],
        [/\)/, { next: "@pop", token: "delimiter.bracket" }],
        [/[^,)]/, "string"],
      ],
      quadrantChart: [
        configDirectiveHandler,
        [/(title|x-axis|y-axis)(.*$)/, ["keyword", "string"]],
        [/(quadrant-[1234])(.*$)/, ["keyword", "string"]],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              "@quadrantChartBlockKeywords": "typeKeyword",
              "@quadrantChartKeywords": "keyword",
              "@default": "variable",
            },
          },
        ],
        [/".*?"/, "string"],
        [/:/, "delimiter.bracket"],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
      ],
      xychart: [
        configDirectiveHandler,
        [/(title|x-axis|y-axis)(.*$)/, ["keyword", "string"]],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              "@xychartBlockKeywords": "typeKeyword", 
              "@xychartKeywords": "keyword",
              "@default": "variable",
            },
          },
        ],
        [/".*?"/, "string"],
        [/:/, "delimiter.bracket"],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
      ],
      sankey: [
        configDirectiveHandler,
        [/(title|accDescription)(.*$)/, ["keyword", "string"]],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              "@sankeyBlockKeywords": "typeKeyword",
              "@sankeyKeywords": "keyword", 
              "@default": "variable",
            },
          },
        ],
        [/".*?"/, "string"],
        [/:/, "delimiter.bracket"],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
      ],
      architecture: [
        configDirectiveHandler,
        [/(title|accDescription)(.*$)/, ["keyword", "string"]],
        [
          /[a-zA-Z][\w$]*/,
          {
            cases: {
              "@architectureBlockKeywords": "typeKeyword",
              "@architectureKeywords": "keyword",
              "@default": "variable", 
            },
          },
        ],
        [/".*?"/, "string"],
        [/:/, "delimiter.bracket"],
        [/%%[^$]([^%]*(?!%%$)%?)*$/, "comment"],
      ],
    },
  });

  // Define themes
  monaco.editor.defineTheme("mermaid", {
    base: "vs",
    inherit: true,
    colors: {},
    rules: [
      { token: "typeKeyword", foreground: "9650c8", fontStyle: "bold" },
      { token: "keyword", foreground: "649696" },
      { token: "custom-error", foreground: "ff0000", fontStyle: "bold" },
      { token: "string", foreground: "AA8500" },
      { token: "transition", foreground: "008800", fontStyle: "bold" },
      { token: "delimiter.bracket", foreground: "000000", fontStyle: "bold" },
      { token: "annotation", foreground: "4b4b96" },
      { token: "number", foreground: "4b4b96" },
      { token: "comment", foreground: "888c89" },
      { token: "variable", foreground: "A22889" },
      { token: "type", foreground: "2BDEA8" },
      { token: "identifier", foreground: "9cdcfe" },
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
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Sequence Diagram Loops",
        },
        {
          label: "alt",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            "alt ${1:Describing text}",
            "\t$0",
            "else",
            "\t",
            "end",
          ].join("\n"),
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Alternative Path",
        },
        {
          label: "opt",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["opt ${1:Describing text}", "\t$0", "end"].join("\n"),
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Parallel Actions",
        },
        {
          label: "rect",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["rect ${1:rgb(0, 255, 0)}", "\t$0", "end"].join("\n"),
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Background Color",
        },
        {
          label: "subgraph",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["subgraph ${1:title}", "\t$0", "end"].join("\n"),
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Subgraph",
        },
        {
          label: "class",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["class ${1:className} {", "\t$0", "}"].join("\n"),
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Class",
        },
        {
          label: "state",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["state ${1:stateName} {", "\t$0", "}"].join("\n"),
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "State",
        },
        {
          label: "note",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["note ${1:right of State1}", "\t$0", "end note"].join(
            "\n"
          ),
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "State",
        },
        {
          label: "section",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["section ${1:Go to work}", "\t$0"].join("\n"),
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "User-journey Section",
        },
        {
          label: "element",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["element ${1:test_entity} {", "\t$0", "}"].join("\n"),
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Requirement Diagram Element",
        },
        {
          label: "options",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: ["options", "{", "    $0", "}", "end"].join("\n"),
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Git Graph Options",
        },
        ...keywords.c4Diagram.blockKeywords.map((containerType) => ({
          label: containerType,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            containerType + ' (${1:boundary_id}, "New Boundary") {',
            "    $0",
            "}",
          ].join("\n"),
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                  .map((entry) => entry[1])
              )
              .flat(2)
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
