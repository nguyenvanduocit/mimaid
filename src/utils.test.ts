import { describe, it, expect, beforeEach } from "vitest";
import { loadDiagramFromURL, generateDiagramHash } from "./utils";

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
});
