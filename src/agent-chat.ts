import { PROTOCOL_VERSION, client, methods, type SessionConfigOption, type Stream } from "@agentclientprotocol/sdk";

/** The model option an agent offers: which values it takes and which is in use. */
export interface ModelChoice {
  /** The id of the config option; `setModel` sends the new value under it. */
  configId: string;
  current: string;
  options: { value: string; name: string }[];
}

export interface AgentChat {
  /** The agent's model option, or null when the agent offers no choice of model. */
  readonly model: ModelChoice | null;
  /** Asks the agent to use another of `model.options` from the next prompt on. */
  setModel(value: string): Promise<void>;
  /** Sends one prompt; `onText` hears each piece of the agent's reply as it arrives. Resolves when the turn ends. */
  prompt(text: string, onText: (piece: string) => void): Promise<void>;
  close(): void;
}

/** The first select option of the model category, its grouped values flattened. */
function modelChoiceOf(configOptions: SessionConfigOption[] | null | undefined): ModelChoice | null {
  const option = configOptions?.find((o) => o.category === "model" && o.type === "select");
  if (!option || option.type !== "select") return null;
  const options = option.options.flatMap((entry) => ("options" in entry ? entry.options : [entry]));
  return { configId: option.id, current: option.currentValue, options: options.map(({ value, name }) => ({ value, name })) };
}

/**
 * One ACP session on an agent that is already connected through `stream`. The agent may ask to run tools; the page
 * answers every permission request with "cancelled", so a prompt only ever yields text. The session starts on
 * `preferredModel` when the agent offers it.
 */
export async function openAgentChat(stream: Stream, cwd: string, preferredModel?: string | null): Promise<AgentChat> {
  let onText: (piece: string) => void = () => {};

  const connection = client({ name: "mimaid" })
    .onNotification(methods.client.session.update, ({ params }) => {
      const { update } = params;
      if (update.sessionUpdate === "agent_message_chunk" && update.content.type === "text") {
        onText(update.content.text);
      }
    })
    .onRequest(methods.client.session.requestPermission, () => ({ outcome: { outcome: "cancelled" } }))
    .connect(stream);

  await connection.agent.request(methods.agent.initialize, { protocolVersion: PROTOCOL_VERSION, clientCapabilities: {} });
  const { sessionId, configOptions } = await connection.agent.request(methods.agent.session.new, { cwd, mcpServers: [] });

  let model = modelChoiceOf(configOptions);

  const chat: AgentChat = {
    get model() {
      return model;
    },
    async setModel(value) {
      if (!model) throw new Error("This agent does not offer a choice of model");
      const response = await connection.agent.request(methods.agent.session.setConfigOption, {
        sessionId,
        configId: model.configId,
        value,
      });
      model = modelChoiceOf(response.configOptions);
    },
    async prompt(text, listener) {
      onText = listener;
      try {
        await connection.agent.request(methods.agent.session.prompt, { sessionId, prompt: [{ type: "text", text }] });
      } finally {
        onText = () => {};
      }
    },
    close: () => connection.close(),
  };

  if (preferredModel && model && preferredModel !== model.current && model.options.some((o) => o.value === preferredModel)) {
    await chat.setModel(preferredModel);
  }
  return chat;
}
