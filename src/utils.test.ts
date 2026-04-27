import { describe, it, expect, beforeEach } from "vitest";
import { loadDiagramFromURL, generateDiagramHash, parseMermaidError } from "./utils";

describe("URL hash compression", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("roundtrips diagram code through hash compression", () => {
    const original = "flowchart TD\n  A[Start] --> B[End]";
    generateDiagramHash(original);
    const decoded = loadDiagramFromURL();
    expect(decoded).toBe(original);
  });

  it("returns null when no hash is present", () => {
    expect(loadDiagramFromURL()).toBeNull();
  });

  it("clears hash when given empty string", () => {
    generateDiagramHash("flowchart TD\n  A --> B");
    expect(window.location.hash).not.toBe("");
    generateDiagramHash("");
    expect(window.location.hash).toBe("");
  });
});

describe("parseMermaidError", () => {
  it("extracts line number from 'Parse error on line N' format", () => {
    const result = parseMermaidError(
      "Parse error on line 5: unexpected token",
      "flowchart TD\nA --> B\nC --> D\nE\nF -- G",
    );
    expect(result.line).toBe(5);
    expect(result.severity).toBe("error");
    expect(result.source).toBe("mermaid");
  });

  it("extracts both line and column from 'line N:M' format", () => {
    const result = parseMermaidError(
      "Syntax error at line 3:7 — unexpected character",
      "flowchart TD\n A --> B\n C --> D",
    );
    expect(result.line).toBe(3);
    expect(result.column).toBe(7);
  });

  it("returns parsed error even when no line info is in the message", () => {
    const result = parseMermaidError("Diagram type not recognized", "flowchart TD\nA --> B");
    expect(result.severity).toBe("error");
    expect(result.message).toMatch(/diagram/i);
    // inferErrorLine kicks in for "diagram" keyword and returns line 1
    expect(result.line).toBe(1);
  });

  it("cleans error message by removing redundant prefixes and trailing line refs", () => {
    const result = parseMermaidError(
      "Parse error: unexpected end of input on line 2",
      "flowchart TD\nA -->",
    );
    // Prefix "Parse error:" stripped, trailing "on line 2" stripped, capitalized, period added
    expect(result.message).toBe("Unexpected end of input.");
  });
});
