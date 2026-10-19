import { createHighlightState, highlightMermaidLine, type HighlightState } from "./mermaid-highlight";
import { keywords } from "./mermaid-keywords";

type DiagramKeywords = { typeKeywords?: string[]; blockKeywords?: string[]; keywords?: string[] };
const diagrams = Object.entries(keywords as Record<string, DiagramKeywords>);

// The first word of a diagram (`sequenceDiagram`, `kanban`, ...) names its keyword set.
const diagramByDeclaration = new Map(
  diagrams.flatMap(([diagram, entry]) => (entry.typeKeywords ?? []).map((word) => [word.toLowerCase(), diagram] as const)),
);
const keywordsByDiagram = new Map(
  diagrams.map(([diagram, entry]) => [
    diagram,
    new Set([...(entry.typeKeywords ?? []), ...(entry.blockKeywords ?? []), ...(entry.keywords ?? [])].map((word) => word.toLowerCase())),
  ]),
);

const entities: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
const maxLineLength = 2_000;

/** Monaco `IState` for the tokenizer: pele's per-line flags plus the diagram found on the first line. */
export class MermaidLineState {
  constructor(
    readonly flags: HighlightState = createHighlightState(),
    /** undefined until the declaration line is seen; null when it names no known diagram. */
    readonly diagram: string | null | undefined = undefined,
  ) {}

  clone(): MermaidLineState {
    return new MermaidLineState({ ...this.flags }, this.diagram);
  }

  equals(other: unknown): boolean {
    return (
      other instanceof MermaidLineState &&
      this.diagram === other.diagram &&
      (Object.keys(this.flags) as (keyof HighlightState)[]).every((key) => this.flags[key] === other.flags[key])
    );
  }
}

/** Declaration line: not blank, not frontmatter (`---`), not a `%%` comment or directive. */
const declaredDiagram = (line: string, before: HighlightState, after: HighlightState): string | null | undefined => {
  const trimmed = line.trim();
  if (!trimmed || before.frontmatter || after.frontmatter || /^---\s*$/.test(trimmed) || trimmed.startsWith("%%")) return undefined;
  return diagramByDeclaration.get(trimmed.match(/^[\w-]+/)?.[0].toLowerCase() ?? "") ?? null;
};

/**
 * Tokenize one line for `monaco.languages.setTokensProvider`. Scopes are pele's `syn-*` class
 * names; identifiers that are keywords of the declared diagram become `syn-keyword`.
 */
export function tokenizeMermaidLine(line: string, state: MermaidLineState) {
  const plain = [{ startIndex: 0, scopes: "" }];
  if (line.length > maxLineLength) return { tokens: plain, endState: state.clone() };

  const flags = { ...state.flags };
  const html = highlightMermaidLine(line, flags);
  const diagram = state.diagram === undefined ? declaredDiagram(line, state.flags, flags) : state.diagram;
  const diagramKeywords = diagram ? keywordsByDiagram.get(diagram) : undefined;

  const classes: string[] = [];
  const tokens: { startIndex: number; scopes: string }[] = [];
  let offset = 0;
  for (const match of html.matchAll(/<span class="([\w-]+)">|<\/span>|([^<]+)/g)) {
    if (match[1]) classes.push(match[1]);
    else if (match[2]) {
      const text = match[2].replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => entities[entity]);
      const scope = classes.at(-1) ?? "";
      const isKeyword = scope === "syn-variable" && diagramKeywords?.has(text.toLowerCase());
      tokens.push({ startIndex: offset, scopes: isKeyword ? "syn-keyword" : scope });
      offset += text.length;
    } else classes.pop();
  }
  return { tokens: tokens.length ? tokens : plain, endState: new MermaidLineState(flags, diagram) };
}
