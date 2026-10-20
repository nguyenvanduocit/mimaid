import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION, RequestError, agent, methods, type SessionConfigOption, type Stream } from "@agentclientprotocol/sdk";
import { openAgentChat } from "./agent-chat";

type Message = Stream extends { readable: ReadableStream<infer M> } ? M : never;

/** Two cross-wired streams: what one side writes, the other reads. */
function streamPair(): { client: Stream; agent: Stream } {
  const toAgent = new TransformStream<Message>();
  const toClient = new TransformStream<Message>();
  return {
    client: { writable: toAgent.writable, readable: toClient.readable },
    agent: { writable: toClient.writable, readable: toAgent.readable },
  };
}

interface FakeAgent {
  cwds: string[];
  sessionIds: string[];
  permissionOutcomes: unknown[];
  configCalls: { configId: string; value: unknown }[];
}

/** An ACP agent that answers each prompt by sending `reply(promptText)` as message chunks. */
function startAgent(
  stream: Stream,
  reply: (prompt: string) => string[] | RequestError,
  opts: { askPermission?: boolean; configOptions?: SessionConfigOption[] } = {},
): FakeAgent {
  const seen: FakeAgent = { cwds: [], sessionIds: [], permissionOutcomes: [], configCalls: [] };
  let configOptions = opts.configOptions;
  agent({ name: "fake" })
    .onRequest(methods.agent.initialize, () => ({ protocolVersion: PROTOCOL_VERSION, agentCapabilities: {} }))
    .onRequest(methods.agent.session.new, ({ params }) => {
      seen.cwds.push(params.cwd);
      return { sessionId: `s${seen.cwds.length}`, configOptions };
    })
    .onRequest(methods.agent.session.setConfigOption, ({ params }) => {
      seen.configCalls.push({ configId: params.configId, value: params.value });
      configOptions = (configOptions ?? []).map((option) =>
        option.id === params.configId && option.type === "select" ? { ...option, currentValue: String(params.value) } : option,
      );
      return { configOptions };
    })
    .onRequest(methods.agent.session.prompt, async ({ params, client }) => {
      seen.sessionIds.push(params.sessionId);
      const text = params.prompt.map((block) => (block.type === "text" ? block.text : "")).join("");
      const pieces = reply(text);
      if (pieces instanceof RequestError) throw pieces;

      if (opts.askPermission) {
        const answer = await client.request(methods.client.session.requestPermission, {
          sessionId: params.sessionId,
          toolCall: { toolCallId: "t1", title: "Write a file" },
          options: [{ optionId: "allow", name: "Allow", kind: "allow_once" }],
        });
        seen.permissionOutcomes.push(answer.outcome);
      }

      await client.notify(methods.client.session.update, {
        sessionId: params.sessionId,
        update: { sessionUpdate: "tool_call", toolCallId: "t1", title: "Thinking" },
      });
      for (const piece of pieces) {
        await client.notify(methods.client.session.update, {
          sessionId: params.sessionId,
          update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: piece } },
        });
      }
      return { stopReason: "end_turn" };
    })
    .connect(stream);
  return seen;
}

describe("openAgentChat", () => {
  it("passes the agent's text pieces to onText in order and resolves when the turn ends", async () => {
    const pair = streamPair();
    startAgent(pair.agent, () => ["flowchart TD\n", "  A --> B"]);
    const chat = await openAgentChat(pair.client, "/tmp/scratch");

    const pieces: string[] = [];
    await chat.prompt("draw it", (piece) => pieces.push(piece));

    expect(pieces).toEqual(["flowchart TD\n", "  A --> B"]);
  });

  it("sends the prompt text and opens the session in the given folder", async () => {
    const pair = streamPair();
    const seen = startAgent(pair.agent, (prompt) => [`echo: ${prompt}`]);
    const chat = await openAgentChat(pair.client, "/tmp/scratch");

    const pieces: string[] = [];
    await chat.prompt("hello", (piece) => pieces.push(piece));

    expect(seen.cwds).toEqual(["/tmp/scratch"]);
    expect(pieces).toEqual(["echo: hello"]);
  });

  it("keeps one session across prompts", async () => {
    const pair = streamPair();
    const seen = startAgent(pair.agent, () => ["ok"]);
    const chat = await openAgentChat(pair.client, "/tmp/scratch");

    await chat.prompt("first", () => {});
    await chat.prompt("second", () => {});

    expect(seen.cwds).toHaveLength(1);
    expect(seen.sessionIds).toEqual(["s1", "s1"]);
  });

  it("answers a permission request with a cancelled outcome", async () => {
    const pair = streamPair();
    const seen = startAgent(pair.agent, () => ["done"], { askPermission: true });
    const chat = await openAgentChat(pair.client, "/tmp/scratch");

    await chat.prompt("write something", () => {});

    expect(seen.permissionOutcomes).toEqual([{ outcome: "cancelled" }]);
  });

  it("rejects when the agent fails the prompt", async () => {
    const pair = streamPair();
    startAgent(pair.agent, () => RequestError.internalError(undefined, "agent exploded"));
    const chat = await openAgentChat(pair.client, "/tmp/scratch");

    await expect(chat.prompt("anything", () => {})).rejects.toThrow("agent exploded");
  });

  it("hears each prompt's pieces on that prompt's callback only", async () => {
    const pair = streamPair();
    startAgent(pair.agent, (prompt) => [prompt.toUpperCase()]);
    const chat = await openAgentChat(pair.client, "/tmp/scratch");

    const first: string[] = [];
    const second: string[] = [];
    await chat.prompt("one", (piece) => first.push(piece));
    await chat.prompt("two", (piece) => second.push(piece));

    expect(first).toEqual(["ONE"]);
    expect(second).toEqual(["TWO"]);
  });
});

const modelOption: SessionConfigOption = {
  id: "model",
  name: "Model",
  category: "model",
  type: "select",
  currentValue: "sonnet",
  options: [
    { value: "sonnet", name: "Sonnet" },
    { value: "opus", name: "Opus" },
  ],
};
const modeOption: SessionConfigOption = {
  id: "mode",
  name: "Mode",
  category: "mode",
  type: "select",
  currentValue: "auto",
  options: [{ value: "auto", name: "Auto" }],
};

describe("the model of an agent", () => {
  it("lists the agent's model option with its current value", async () => {
    const pair = streamPair();
    startAgent(pair.agent, () => [], { configOptions: [modeOption, modelOption] });
    const chat = await openAgentChat(pair.client, "/tmp/scratch");

    expect(chat.model).toEqual({
      configId: "model",
      current: "sonnet",
      options: [
        { value: "sonnet", name: "Sonnet" },
        { value: "opus", name: "Opus" },
      ],
    });
  });

  it("flattens grouped values into one list", async () => {
    const pair = streamPair();
    const grouped: SessionConfigOption = {
      ...modelOption,
      options: [
        { group: "fast", name: "Fast", options: [{ value: "haiku", name: "Haiku" }] },
        { group: "deep", name: "Deep", options: [{ value: "opus", name: "Opus" }] },
      ],
    } as SessionConfigOption;
    startAgent(pair.agent, () => [], { configOptions: [grouped] });
    const chat = await openAgentChat(pair.client, "/tmp/scratch");

    expect(chat.model?.options).toEqual([
      { value: "haiku", name: "Haiku" },
      { value: "opus", name: "Opus" },
    ]);
  });

  it("is null when the agent offers no model option", async () => {
    const pair = streamPair();
    startAgent(pair.agent, () => [], { configOptions: [modeOption] });
    const chat = await openAgentChat(pair.client, "/tmp/scratch");

    expect(chat.model).toBeNull();
  });

  it("is null when the agent lists no options at all", async () => {
    const pair = streamPair();
    startAgent(pair.agent, () => []);
    const chat = await openAgentChat(pair.client, "/tmp/scratch");

    expect(chat.model).toBeNull();
  });

  it("asks the agent to switch and then reports the new model", async () => {
    const pair = streamPair();
    const seen = startAgent(pair.agent, () => [], { configOptions: [modelOption] });
    const chat = await openAgentChat(pair.client, "/tmp/scratch");

    await chat.setModel("opus");

    expect(seen.configCalls).toEqual([{ configId: "model", value: "opus" }]);
    expect(chat.model?.current).toBe("opus");
  });

  it("refuses to switch an agent that offers no model option", async () => {
    const pair = streamPair();
    startAgent(pair.agent, () => []);
    const chat = await openAgentChat(pair.client, "/tmp/scratch");

    await expect(chat.setModel("opus")).rejects.toThrow(/model/i);
  });

  it("opens on the preferred model when the agent offers it", async () => {
    const pair = streamPair();
    const seen = startAgent(pair.agent, () => [], { configOptions: [modelOption] });
    const chat = await openAgentChat(pair.client, "/tmp/scratch", "opus");

    expect(seen.configCalls).toEqual([{ configId: "model", value: "opus" }]);
    expect(chat.model?.current).toBe("opus");
  });

  it("keeps the agent's model when the preferred one is not offered", async () => {
    const pair = streamPair();
    const seen = startAgent(pair.agent, () => [], { configOptions: [modelOption] });
    const chat = await openAgentChat(pair.client, "/tmp/scratch", "gpt-9");

    expect(seen.configCalls).toEqual([]);
    expect(chat.model?.current).toBe("sonnet");
  });

  it("does not switch when the preferred model is already current", async () => {
    const pair = streamPair();
    const seen = startAgent(pair.agent, () => [], { configOptions: [modelOption] });
    await openAgentChat(pair.client, "/tmp/scratch", "sonnet");

    expect(seen.configCalls).toEqual([]);
  });
});
