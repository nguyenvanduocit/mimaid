import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentInfo, LocalDaemon, LocalState } from "@agentd/client";
import { Agentd, panelOf, pickAgent, readyAgents } from "./agentd";

const claude: AgentInfo = { name: "claude", title: "Claude Code", ready: true, reason: "" };
const codex: AgentInfo = { name: "codex", title: "Codex", ready: true, reason: "" };
const grok: AgentInfo = { name: "grok", title: "Grok", ready: false, reason: "not logged in" };

function state(over: Partial<LocalState> & { found: LocalState["found"] }): LocalState {
  return { connecting: false, error: "", canConnect: false, ...over };
}

const absent = state({ found: { found: false } });
const available = (agents: AgentInfo[] | undefined = [claude]) =>
  state({ found: { found: true, port: 47615, version: "0.6.0", granted: { server: false, browser: false }, agents }, canConnect: true });
const connected = (agents: AgentInfo[] | undefined) =>
  state({ found: { found: true, port: 47615, version: "0.6.0", granted: { server: false, browser: true }, agents } });

describe("readyAgents", () => {
  it("is empty while no daemon answered", () => {
    expect(readyAgents(absent)).toEqual([]);
  });

  it("is empty until the user allowed this page", () => {
    expect(readyAgents(available([claude, codex]))).toEqual([]);
  });

  it("lists the ready agents of a daemon that serves this page", () => {
    expect(readyAgents(connected([claude, grok, codex]))).toEqual([claude, codex]);
  });

  it("is empty for a daemon that does not list its agents", () => {
    expect(readyAgents(connected(undefined))).toEqual([]);
  });
});

describe("pickAgent", () => {
  it("keeps the saved agent while it is ready", () => {
    expect(pickAgent([claude, codex], "codex")).toBe(codex);
  });

  it("falls back to the first ready agent when the saved one is not ready", () => {
    expect(pickAgent([claude, codex], "grok")).toBe(claude);
  });

  it("falls back to the first ready agent when nothing was saved", () => {
    expect(pickAgent([codex, claude], null)).toBe(codex);
  });

  it("is undefined when no agent is ready", () => {
    expect(pickAgent([], "claude")).toBeUndefined();
  });
});

describe("panelOf", () => {
  it("tells the user to install and open agentd while no daemon answered", () => {
    const panel = panelOf(absent);
    expect(panel.action).toBe("download");
    expect(panel.message).toMatch(/install/i);
    expect(panel.message).toMatch(/browser/i);
  });

  it("offers to connect a daemon this page is not allowed on yet, and says what the dialog asks", () => {
    const panel = panelOf(available());
    expect(panel.action).toBe("connect");
    expect(panel.message).toMatch(/allow this page and choose a folder/i);
  });

  it("offers nothing while the daemon's dialog waits for the user", () => {
    const panel = panelOf(state({ ...available(), connecting: true, canConnect: false }));
    expect(panel.action).toBeNull();
    expect(panel.message).toMatch(/dialog/i);
  });

  it("says why the last connection did not happen and lets the user retry", () => {
    const panel = panelOf(state({ ...available(), error: "You declined the request." }));
    expect(panel.action).toBe("connect");
    expect(panel.message).toContain("You declined the request.");
  });

  it("lets a connected user pick among the ready agents and disconnect", () => {
    const panel = panelOf(connected([claude, grok, codex]));
    expect(panel.action).toBe("disconnect");
    expect(panel.agents).toEqual([claude, codex]);
    expect(panel.message).toMatch(/connected/i);
  });

  it("names why an agent is not ready, and what to do, when none is", () => {
    const panel = panelOf(connected([grok]));
    expect(panel.action).toBe("disconnect");
    expect(panel.agents).toEqual([]);
    expect(panel.message).toContain("Grok");
    expect(panel.message).toContain("not logged in");
    expect(panel.message).toMatch(/log in|install/i);
  });

  it("asks to update a daemon that does not list its agents", () => {
    const panel = panelOf(connected(undefined));
    expect(panel.agents).toEqual([]);
    expect(panel.message).toMatch(/update agentd/i);
  });

  it("keeps agentd's version out of what the user reads", () => {
    for (const s of [available(), connected([claude]), connected([grok])]) {
      expect(panelOf(s).message).not.toContain("0.6.0");
    }
  });
});

/** A daemon whose connect() is answered by `allow`; once connected it serves `claude` and `codex`. */
function fakeDaemon(allow: boolean): LocalDaemon {
  const daemon = {
    state: available(),
    subscribe: () => () => {},
    detect: async () => {},
    connect: async () => {
      if (allow) daemon.state = connected([claude, codex]);
      return allow;
    },
    disconnect: async () => {
      daemon.state = available();
    },
  };
  return daemon;
}

describe("Agentd", () => {
  beforeEach(() => {
    // Node's own experimental `localStorage` shadows jsdom's and is unusable without --localstorage-file.
    const items = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
      removeItem: (key: string) => void items.delete(key),
    });
  });

  it("has not connected before on a fresh browser", () => {
    expect(new Agentd(fakeDaemon(true)).hasConnectedBefore()).toBe(false);
  });

  it("remembers the first ready agent once the user allowed this page", async () => {
    const agentd = new Agentd(fakeDaemon(true));
    await agentd.connect();
    expect(agentd.hasConnectedBefore()).toBe(true);
    expect(agentd.agent()).toBe(claude);
  });

  it("remembers nothing when the user refused", async () => {
    const agentd = new Agentd(fakeDaemon(false));
    await agentd.connect();
    expect(agentd.hasConnectedBefore()).toBe(false);
  });

  it("uses the agent the user selected", async () => {
    const agentd = new Agentd(fakeDaemon(true));
    await agentd.connect();
    agentd.select("codex");
    expect(agentd.agent()).toBe(codex);
  });

  it("forgets the agent when the user disconnects", async () => {
    const agentd = new Agentd(fakeDaemon(true));
    await agentd.connect();
    await agentd.disconnect();
    expect(agentd.hasConnectedBefore()).toBe(false);
  });
});
