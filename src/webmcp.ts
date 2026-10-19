import { render, PeleError } from "pele";
import LZString from "lz-string";
import { createShortLink } from "./short-link";
import { SKILL_CONTENT } from "./skill-content";

// WebMCP (https://webmachinelearning.github.io/webmcp/): pages register tools on
// `document.modelContext` so in-browser agents can drive the app.

interface ToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
  consequentialHint?: boolean;
}

interface ModelContextTool {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations?: ToolAnnotations;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

interface ModelContext {
  registerTool(tool: ModelContextTool, options?: { signal: AbortSignal }): Promise<void>;
}

export interface WebMcpApp {
  getCode(): string;
  setCode(code: string): void;
}

const SHARE_KINDS = ["edit", "embed", "collab"] as const;
type ShareKind = (typeof SHARE_KINDS)[number];

const OPTIONAL_CODE = {
  type: "string",
  description: "Mermaid source. Defaults to the diagram currently in the editor.",
} as const;

// Chrome reports any exception thrown by `execute` as an opaque UnknownError, so
// failures an agent can act on are thrown as ToolError and returned as `{ "error": ... }`.
class ToolError extends Error {}

function check(code: string): { svg: string } | { error: { message: string; line?: number; column?: number; snippet?: string } } {
  if (code.trim().length === 0) return { error: { message: "Diagram is empty" } };
  try {
    return { svg: render(code, { responsive: false }).svg };
  } catch (error) {
    if (error instanceof PeleError) {
      const { message, line, column, snippet } = error;
      return { error: { message, line, column, snippet } };
    }
    throw error;
  }
}

function validate(code: string) {
  const result = check(code);
  return "error" in result ? { valid: false, error: result.error } : { valid: true };
}

function buildShareUrl(code: string, kind: ShareKind): string {
  const { origin, pathname } = window.location;
  const hash = `#${LZString.compressToEncodedURIComponent(code)}`;
  if (kind === "embed") return `${origin}${pathname}?hideEditor${hash}`;
  if (kind === "collab") {
    const room = Math.random().toString(36).substring(2, 10);
    return `${origin}${pathname}?room=${room}${hash}`;
  }
  return `${origin}${pathname}${hash}`;
}

export function createWebMcpTools(app: WebMcpApp): ModelContextTool[] {
  const json = (value: unknown) => JSON.stringify(value);

  const codeArg = (args: Record<string, unknown>): string => {
    if (args.code === undefined) return app.getCode();
    if (typeof args.code !== "string") throw new ToolError("`code` must be a string");
    return args.code;
  };

  const nonEmptyCodeArg = (args: Record<string, unknown>): string => {
    const code = codeArg(args);
    if (code.trim().length === 0) throw new ToolError("Diagram is empty");
    return code;
  };

  const tools: ModelContextTool[] = [
    {
      name: "get_diagram",
      title: "Get diagram",
      description:
        "Return the Mermaid source currently in the editor and whether it renders. If it does not, the error carries line and column.",
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () => {
        const code = app.getCode();
        return json({ code, ...validate(code) });
      },
    },
    {
      name: "set_diagram",
      title: "Set diagram",
      description:
        "Replace the editor content with Mermaid source. The preview and the share URL update automatically. Returns whether the diagram renders; if not, fix the reported line and call again.",
      inputSchema: {
        type: "object",
        properties: { code: { type: "string", description: "Complete Mermaid source." } },
        required: ["code"],
      },
      execute: async (args) => {
        if (typeof args.code !== "string") throw new ToolError("`code` must be a string");
        app.setCode(args.code);
        return json(validate(args.code));
      },
    },
    {
      name: "validate_diagram",
      title: "Validate diagram",
      description:
        "Check Mermaid source for syntax errors without changing the editor. Use it to test a draft before set_diagram.",
      inputSchema: {
        type: "object",
        properties: { code: { type: "string", description: "Mermaid source to check." } },
        required: ["code"],
      },
      annotations: { readOnlyHint: true },
      execute: async (args) => json(validate(codeArg(args))),
    },
    {
      name: "export_svg",
      title: "Export SVG",
      description: "Render Mermaid source to a standalone SVG string.",
      inputSchema: { type: "object", properties: { code: OPTIONAL_CODE } },
      annotations: { readOnlyHint: true },
      execute: async (args) => {
        const result = check(nonEmptyCodeArg(args));
        if ("error" in result) throw new ToolError(`Diagram does not render: ${JSON.stringify(result.error)}`);
        return result.svg;
      },
    },
    {
      name: "get_share_url",
      title: "Get share URL",
      description:
        "Build a link that opens the diagram. The source is compressed into the URL hash, so nothing is stored on a server. kind: edit = editor and preview, embed = preview only, collab = live collaboration room.",
      inputSchema: {
        type: "object",
        properties: {
          kind: { type: "string", enum: SHARE_KINDS, description: "Defaults to edit." },
          code: OPTIONAL_CODE,
        },
      },
      annotations: { readOnlyHint: true },
      execute: async (args) => {
        const kind = args.kind ?? "edit";
        if (!SHARE_KINDS.includes(kind as ShareKind)) {
          throw new ToolError(`kind must be one of: ${SHARE_KINDS.join(", ")}`);
        }
        return buildShareUrl(nonEmptyCodeArg(args), kind as ShareKind);
      },
    },
    {
      name: "create_short_link",
      title: "Create short link",
      description:
        "Upload the Mermaid source to the server and return a short /s/<id> link. Links expire after 90 days. Prefer get_share_url unless a short link is needed.",
      inputSchema: { type: "object", properties: { code: OPTIONAL_CODE } },
      annotations: { consequentialHint: true },
      execute: async (args) => {
        const code = nonEmptyCodeArg(args);
        try {
          return await createShortLink(code);
        } catch (error) {
          throw new ToolError(`Could not create short link: ${(error as Error).message}`);
        }
      },
    },
    {
      name: "get_syntax_guide",
      title: "Get syntax guide",
      description:
        "Return the Mermaid syntax rules for this app (supported diagram types and common mistakes). Read it before writing a diagram.",
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () => SKILL_CONTENT,
    },
  ];

  return tools.map((tool) => ({
    ...tool,
    execute: async (args) => {
      try {
        return await tool.execute(args);
      } catch (error) {
        if (error instanceof ToolError) return json({ error: error.message });
        throw error;
      }
    },
  }));
}

/** Registers the tools when the browser supports WebMCP; returns a function that unregisters them. */
export function registerWebMcpTools(app: WebMcpApp): () => void {
  const modelContext = (document as Document & { modelContext?: ModelContext }).modelContext;
  const controller = new AbortController();
  if (!modelContext) return () => {};

  for (const tool of createWebMcpTools(app)) {
    modelContext
      .registerTool(tool, { signal: controller.signal })
      .catch((error) => console.error(`WebMCP: failed to register ${tool.name}`, error));
  }
  return () => controller.abort();
}
