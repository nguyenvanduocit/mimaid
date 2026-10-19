import { describe, it, expect, vi, beforeEach } from "vitest";
import LZString from "lz-string";
import { createWebMcpTools, registerWebMcpTools } from "./webmcp";

const FLOWCHART = "flowchart TD\n  A[Start] --> B[End]";

function setup(initial = FLOWCHART) {
  let code = initial;
  const app = { getCode: () => code, setCode: vi.fn((next: string) => (code = next)) };
  const tools = Object.fromEntries(createWebMcpTools(app).map((tool) => [tool.name, tool]));
  return { app, tools, run: async (name: string, args: Record<string, unknown> = {}) => tools[name].execute(args) };
}

describe("createWebMcpTools", () => {
  it("declares the tool set with schemas and annotations", () => {
    const { tools } = setup();
    expect(Object.keys(tools)).toEqual([
      "get_diagram",
      "set_diagram",
      "validate_diagram",
      "export_svg",
      "get_share_url",
      "create_short_link",
      "get_syntax_guide",
    ]);
    expect(tools.get_diagram.annotations?.readOnlyHint).toBe(true);
    expect(tools.set_diagram.annotations).toBeUndefined();
    expect(tools.create_short_link.annotations?.consequentialHint).toBe(true);
  });

  it("get_diagram returns the editor source and validity", async () => {
    const { run } = setup();
    expect(JSON.parse(await run("get_diagram"))).toEqual({ code: FLOWCHART, valid: true });
  });

  it("set_diagram writes the editor and reports validity", async () => {
    const { app, run } = setup("");
    const result = JSON.parse(await run("set_diagram", { code: FLOWCHART }));
    expect(app.setCode).toHaveBeenCalledWith(FLOWCHART);
    expect(result).toEqual({ valid: true });
  });

  it("set_diagram rejects a non-string code", async () => {
    const { app, run } = setup();
    expect(JSON.parse(await run("set_diagram", { code: 42 }))).toEqual({ error: "`code` must be a string" });
    expect(app.setCode).not.toHaveBeenCalled();
  });

  it("validate_diagram reports a syntax error without touching the editor", async () => {
    const { app, run } = setup();
    const result = JSON.parse(await run("validate_diagram", { code: "notADiagram\n  foo --> bar" }));
    expect(result.valid).toBe(false);
    expect(result.error.message).toEqual(expect.any(String));
    expect(app.setCode).not.toHaveBeenCalled();
  });

  it("export_svg renders the current diagram to SVG", async () => {
    const { run } = setup();
    expect(await run("export_svg")).toMatch(/^<svg/);
  });

  it("export_svg refuses an empty diagram with a readable error", async () => {
    const { run } = setup("  ");
    expect(JSON.parse(await run("export_svg"))).toEqual({ error: "Diagram is empty" });
  });

  it("export_svg explains why a broken diagram does not render", async () => {
    const { run } = setup("flowchart TD\n  A[oops --> B");
    const { error } = JSON.parse(await run("export_svg"));
    expect(error).toContain("Diagram does not render");
    expect(error).toContain('"line":3');
  });

  describe("get_share_url", () => {
    const hashOf = (url: string) => LZString.decompressFromEncodedURIComponent(url.split("#")[1]);

    it("defaults to an edit link that round-trips the source", async () => {
      const { run } = setup();
      const url = await run("get_share_url");
      expect(url).toMatch(/^https?:\/\/[^?#]+#/);
      expect(hashOf(url)).toBe(FLOWCHART);
    });

    it("builds embed and collab links", async () => {
      const { run } = setup();
      expect(await run("get_share_url", { kind: "embed" })).toContain("?hideEditor#");
      expect(await run("get_share_url", { kind: "collab" })).toMatch(/\?room=[a-z0-9]+#/);
    });

    it("uses the code argument over the editor content", async () => {
      const { run } = setup();
      const url = await run("get_share_url", { code: "flowchart LR\n  X --> Y" });
      expect(hashOf(url)).toBe("flowchart LR\n  X --> Y");
    });

    it("rejects an unknown kind", async () => {
      const { run } = setup();
      expect(JSON.parse(await run("get_share_url", { kind: "pdf" })).error).toContain("kind must be one of");
    });
  });

  it("create_short_link posts the source and returns the short URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "abc123" }) });
    vi.stubGlobal("fetch", fetchMock);
    const { run } = setup();
    expect(await run("create_short_link")).toBe(`${window.location.origin}/s/abc123`);
    expect(fetchMock).toHaveBeenCalledWith("/api/shorten", { method: "POST", body: FLOWCHART });
    vi.unstubAllGlobals();
  });

  it("create_short_link returns the server error as text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, statusText: "Too Many Requests", json: async () => ({ error: "Rate limited" }) }));
    const { run } = setup();
    expect(JSON.parse(await run("create_short_link"))).toEqual({ error: "Could not create short link: Rate limited" });
    vi.unstubAllGlobals();
  });

  it("get_syntax_guide returns the skill content", async () => {
    const { run } = setup();
    expect(await run("get_syntax_guide")).toContain("MinimalMermaid");
  });
});

describe("registerWebMcpTools", () => {
  beforeEach(() => {
    delete (document as { modelContext?: unknown }).modelContext;
  });

  it("does nothing when the browser has no WebMCP", () => {
    const unregister = registerWebMcpTools({ getCode: () => "", setCode: () => {} });
    expect(() => unregister()).not.toThrow();
  });

  it("registers every tool on document.modelContext and unregisters through the signal", () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, "modelContext", { value: { registerTool }, configurable: true });

    const unregister = registerWebMcpTools({ getCode: () => "", setCode: () => {} });

    expect(registerTool).toHaveBeenCalledTimes(7);
    const { signal } = registerTool.mock.calls[0][1];
    expect(signal.aborted).toBe(false);
    unregister();
    expect(signal.aborted).toBe(true);
  });
});
