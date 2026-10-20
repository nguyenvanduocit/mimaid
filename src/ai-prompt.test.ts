import { describe, it, expect } from "vitest";
import { buildAgentPrompt, extractMermaid } from "./ai-prompt";

describe("buildAgentPrompt", () => {
  it("carries the Mermaid instructions and forbids tool use", () => {
    const prompt = buildAgentPrompt("make me a flowchart", "");
    expect(prompt).toMatch(/Mermaid/);
    expect(prompt).toMatch(/do not use (any )?tools/i);
  });

  it("ends with the request and has no diagram section when the editor is empty", () => {
    const prompt = buildAgentPrompt("make me a flowchart", "");
    expect(prompt).not.toMatch(/Current diagram/i);
    expect(prompt.endsWith("make me a flowchart")).toBe(true);
  });

  it("puts the current diagram before the request when the editor has code", () => {
    const code = "flowchart TD\n  A --> B";
    const prompt = buildAgentPrompt("add error handling", code);
    const diagramAt = prompt.indexOf(`Current diagram:\n\`\`\`mermaid\n${code}\n\`\`\``);
    expect(diagramAt).toBeGreaterThan(-1);
    expect(prompt.indexOf("add error handling")).toBeGreaterThan(diagramAt);
    expect(prompt.endsWith("add error handling")).toBe(true);
  });
});

describe("extractMermaid", () => {
  it("is empty while the reply has not opened a mermaid block", () => {
    expect(extractMermaid("Sure, here is your diagram")).toBe("");
    expect(extractMermaid("Sure!\n```mermaid")).toBe("");
  });

  it("returns the block so far while it is still open", () => {
    expect(extractMermaid("Sure!\n```mermaid\nflowchart TD\n  A --> B")).toBe("flowchart TD\n  A --> B");
  });

  it("stops at the closing fence and ignores what follows", () => {
    const reply = "```mermaid\nflowchart TD\n  A --> B\n```\nHope this helps!\n```mermaid\nother\n```";
    expect(extractMermaid(reply)).toBe("flowchart TD\n  A --> B");
  });

  it("trims the whitespace around the code", () => {
    expect(extractMermaid("```mermaid\n\n  flowchart TD  \n\n```")).toBe("flowchart TD");
  });
});
