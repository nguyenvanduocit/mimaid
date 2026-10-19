// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createShortLink, hashCode, LINK_TTL_SECONDS, SHORT_ID_PATTERN, ShortLinkStore } from "./short-link";

function memoryStore(): ShortLinkStore & { data: Map<string, string>; ttls: Map<string, number> } {
  const data = new Map<string, string>();
  const ttls = new Map<string, number>();
  return {
    data,
    ttls,
    get: async (key) => data.get(key) ?? null,
    put: async (key, value, { expirationTtl }) => {
      data.set(key, value);
      ttls.set(key, expirationTtl);
    },
  };
}

describe("createShortLink", () => {
  it("stores the code under a 10-char id that matches SHORT_ID_PATTERN", async () => {
    const store = memoryStore();
    const id = await createShortLink(store, "flowchart TD\n  A --> B");
    expect(id).toHaveLength(10);
    expect(id).toMatch(SHORT_ID_PATTERN);
    expect(store.data.get(id)).toBe("flowchart TD\n  A --> B");
  });

  it("returns the same id for the same code and keeps a single entry", async () => {
    const store = memoryStore();
    const first = await createShortLink(store, "graph LR\n  X --> Y");
    const second = await createShortLink(store, "graph LR\n  X --> Y");
    expect(second).toBe(first);
    expect(store.data.size).toBe(1);
  });

  it("sets the TTL on creation and restarts it when the same code is shortened again", async () => {
    const store = memoryStore();
    const id = await createShortLink(store, "graph LR\n  X --> Y");
    expect(store.ttls.get(id)).toBe(LINK_TTL_SECONDS);
    store.ttls.set(id, 1);
    await createShortLink(store, "graph LR\n  X --> Y");
    expect(store.ttls.get(id)).toBe(LINK_TTL_SECONDS);
  });

  it("returns different ids for different code", async () => {
    const store = memoryStore();
    const a = await createShortLink(store, "graph LR\n  A --> B");
    const b = await createShortLink(store, "graph LR\n  A --> C");
    expect(a).not.toBe(b);
  });

  it("uses a longer prefix when the short id is taken by different code", async () => {
    const store = memoryStore();
    const code = "graph LR\n  A --> B";
    const hash = await hashCode(code);
    store.data.set(hash.slice(0, 10), "someone else's diagram");
    const id = await createShortLink(store, code);
    expect(id).toBe(hash.slice(0, 16));
    expect(store.data.get(hash.slice(0, 10))).toBe("someone else's diagram");
  });
});
