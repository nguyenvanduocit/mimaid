import { describe, it, expect } from "vitest";
import { MermaidLineState, tokenizeMermaidLine } from "./mermaid-tokens";

/** Run a whole source through the tokenizer; returns the text of each token with its scope, per line. */
function tokenize(source: string) {
  let state = new MermaidLineState();
  return source.split("\n").map((line) => {
    const { tokens, endState } = tokenizeMermaidLine(line, state);
    state = endState;
    return tokens.map((token, index) => ({
      text: line.slice(token.startIndex, tokens[index + 1]?.startIndex ?? line.length),
      scope: token.scopes,
    }));
  });
}

const scopeOf = (line: { text: string; scope: string }[], text: string) => line.find((token) => token.text === text)?.scope;

describe("tokenizeMermaidLine", () => {
  it("colors the keywords of the declared diagram", () => {
    const lines = tokenize("sequenceDiagram\n  participant A as Alice\n  Note over A,B: shared");
    expect(scopeOf(lines[0], "sequenceDiagram")).toBe("syn-keyword");
    expect(scopeOf(lines[1], "participant")).toBe("syn-keyword");
    expect(scopeOf(lines[1], "Alice")).toBe("syn-variable");
    expect(scopeOf(lines[2], "Note")).toBe("syn-keyword");
    expect(scopeOf(lines[2], "over")).toBe("syn-keyword");
  });

  it("colors keywords of diagrams that came with pele", () => {
    const venn = tokenize("venn-beta\n  set A\n  union A,B");
    expect(scopeOf(venn[0], "venn-beta")).toBe("syn-keyword");
    expect(scopeOf(venn[1], "set")).toBe("syn-keyword");
    expect(scopeOf(venn[2], "union")).toBe("syn-keyword");

    const cynefin = tokenize("cynefin-beta\n  complex\n    \"probe\"");
    expect(scopeOf(cynefin[1], "complex")).toBe("syn-keyword");

    const eventmodeling = tokenize("eventmodeling\n  tf 01 cmd AddItem");
    expect(scopeOf(eventmodeling[1], "tf")).toBe("syn-keyword");
    expect(scopeOf(eventmodeling[1], "cmd")).toBe("syn-keyword");
  });

  it("keeps keywords of other diagrams as plain identifiers", () => {
    const lines = tokenize("flowchart TD\n  participant --> B");
    expect(scopeOf(lines[1], "participant")).toBe("syn-variable");
  });

  it("finds the diagram after frontmatter, directives and comments", () => {
    const lines = tokenize('---\ntitle: demo\n---\n%%{init: {"theme": "dark"}}%%\n%% note\nsequenceDiagram\n  participant A');
    expect(scopeOf(lines[6], "participant")).toBe("syn-keyword");
  });

  it("carries a multi-line quoted label across lines", () => {
    const lines = tokenize('flowchart LR\n  A["multi\n  line"] --> B');
    expect(scopeOf(lines[2], "  line")).toBe("syn-string");
  });

  it("restores the same state when equal", () => {
    const state = new MermaidLineState();
    expect(state.equals(state.clone())).toBe(true);
    expect(state.equals(tokenizeMermaidLine("sequenceDiagram", state).endState)).toBe(false);
  });

  it("does not tokenize very long lines", () => {
    const [line] = tokenize("a".repeat(2_001));
    expect(line).toEqual([{ text: "a".repeat(2_001), scope: "" }]);
  });
});
