import { createLocalDaemon, openSession, type AgentInfo, type LocalDaemon, type LocalState } from "@agentd/client";
import { ndJsonStream } from "@agentclientprotocol/sdk";
import { openAgentChat, type AgentChat } from "./agent-chat";

const AGENT_KEY = "agentdAgent";
const modelKey = (agent: string) => `agentdModel:${agent}`;

/** The agents this page may run now: a daemon is here, the user allowed this page, and the agent is ready. */
export function readyAgents(state: LocalState): AgentInfo[] {
  const { found } = state;
  if (!found.found || !found.granted.browser) return [];
  return (found.agents ?? []).filter((agent) => agent.ready);
}

/** The saved agent while it is ready, else the first ready one. */
export function pickAgent(agents: AgentInfo[], saved: string | null): AgentInfo | undefined {
  return agents.find((agent) => agent.name === saved) ?? agents[0];
}

export interface AgentdPanel {
  message: string;
  action: "download" | "connect" | "disconnect" | null;
  /** The agents to choose from; empty until this page is connected. */
  agents: AgentInfo[];
}

/** What the settings panel shows for a connection state. */
export function panelOf(state: LocalState): AgentdPanel {
  const { found } = state;
  if (!found.found) {
    return {
      message:
        state.error ||
        "agentd is not running on this computer. Install and open it, then come back here. If it is already open, your browser may have blocked this page from reaching it.",
      action: "download",
      agents: [],
    };
  }
  if (state.connecting) {
    return { message: "agentd opened a dialog on this computer. Allow this page and choose a folder to continue.", action: null, agents: [] };
  }
  if (!found.granted.browser) {
    return {
      message:
        state.error ||
        "agentd is running on this computer. Connect it so this page can use your agents. agentd will ask you to allow this page and choose a folder.",
      action: "connect",
      agents: [],
    };
  }

  const agents = readyAgents(state);
  if (agents.length > 0) {
    return { message: "Connected. Choose the agent and model that draw your diagrams.", action: "disconnect", agents };
  }
  if (found.agents === undefined) {
    return { message: "This agentd is too old to list your agents. Update agentd.", action: "disconnect", agents };
  }
  const reasons = found.agents.map((agent) => `${agent.title}: ${agent.reason}`).join("; ");
  return {
    message: `agentd is connected, but none of your agents is ready. ${reasons}. Install or log in to one of them, then reopen this panel.`,
    action: "disconnect",
    agents,
  };
}

/** The agentd daemon on this computer and the one ACP chat this page keeps open on its selected agent. */
export class Agentd {
  private chat: Promise<AgentChat> | null = null;

  constructor(readonly daemon: LocalDaemon = createLocalDaemon({ mode: "browser" })) {}

  /** The agent prompts go to; undefined until this page is connected to a daemon with a ready agent. */
  agent(): AgentInfo | undefined {
    return pickAgent(readyAgents(this.daemon.state), localStorage.getItem(AGENT_KEY));
  }

  /** True once the user has chosen an agent here before: the page may look for the daemon at load. */
  hasConnectedBefore(): boolean {
    return localStorage.getItem(AGENT_KEY) !== null;
  }

  select(name: string): void {
    localStorage.setItem(AGENT_KEY, name);
    this.endChat();
  }

  /** Switches the agent to another of its models and remembers the choice for the next session. */
  async selectModel(value: string): Promise<void> {
    const agent = this.agent();
    if (!agent) throw new Error("agentd is not connected to this page");
    await (await this.openChat()).setModel(value);
    localStorage.setItem(modelKey(agent.name), value);
  }

  /** Asks the user, in the daemon's dialog, to let this page use their agents; remembers the agent it will use. */
  async connect(): Promise<void> {
    if (!(await this.daemon.connect())) return;
    const agent = this.agent();
    if (agent) this.select(agent.name);
  }

  /** Takes this page's grant back and forgets the agent. */
  async disconnect(): Promise<void> {
    await this.daemon.disconnect();
    localStorage.removeItem(AGENT_KEY);
    this.endChat();
  }

  /** The open chat, opened on first use; a new one after the agent changed or its session ended. */
  openChat(): Promise<AgentChat> {
    if (!this.chat) {
      const forget = () => {
        if (this.chat === opening) this.chat = null;
      };
      const opening: Promise<AgentChat> = this.open(forget);
      opening.catch(forget);
      this.chat = opening;
    }
    return this.chat;
  }

  private endChat(): void {
    void this.chat?.then((chat) => chat.close(), () => {});
    this.chat = null;
  }

  private async open(onSessionEnd: () => void): Promise<AgentChat> {
    const { found } = this.daemon.state;
    const agent = this.agent();
    if (!found.found || !agent) throw new Error("agentd is not connected to this page");

    const session = await openSession(found, agent.name);
    session.onClose(onSessionEnd);
    try {
      const chat = await openAgentChat(
        ndJsonStream(session.writable, session.readable),
        session.cwd,
        localStorage.getItem(modelKey(agent.name)),
      );
      return {
        ...chat,
        close: () => {
          chat.close();
          session.close();
        },
      };
    } catch (error) {
      session.close();
      throw error;
    }
  }
}
