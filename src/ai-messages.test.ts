import { describe, it, expect } from "vitest";
import { buildAIMessages } from "./ai-messages";

describe("buildAIMessages", () => {
  it("returns a single user message when currentCode is empty", () => {
    const result = buildAIMessages("make me a flowchart", "");
    expect(result).toEqual([{ role: "user", content: "make me a flowchart" }]);
  });

  it("includes context + assistant ack + new prompt when currentCode is present", () => {
    const code = "flowchart TD\n  A --> B";
    const result = buildAIMessages("add error handling", code);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      role: "user",
      content: `Current diagram code:\n\`\`\`mermaid\n${code}\n\`\`\``,
    });
    expect(result[1].role).toBe("assistant");
    expect(result[1].content).toMatch(/current diagram/i);
    expect(result[2]).toEqual({ role: "user", content: "add error handling" });
  });
});
