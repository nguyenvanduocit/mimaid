import { describe, it, expect, vi, beforeEach } from "vitest";
import { eventBus, EventHelpers } from "./events";

describe("EventHelpers", () => {
  beforeEach(() => {
    eventBus.all.clear();
  });

  it("safeListen receives payloads emitted by safeEmit", () => {
    const handler = vi.fn();
    EventHelpers.safeListen("ai:start", handler);
    EventHelpers.safeEmit("ai:start", { prompt: "hello" });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ prompt: "hello" });
  });

  it("safeListen returns an unsubscribe function that stops further calls", () => {
    const handler = vi.fn();
    const unsubscribe = EventHelpers.safeListen("ai:start", handler);
    EventHelpers.safeEmit("ai:start", { prompt: "first" });
    unsubscribe();
    EventHelpers.safeEmit("ai:start", { prompt: "second" });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ prompt: "first" });
  });

  it("once fires the handler exactly one time across multiple emits", () => {
    const handler = vi.fn();
    EventHelpers.once("ai:start", handler);
    EventHelpers.safeEmit("ai:start", { prompt: "a" });
    EventHelpers.safeEmit("ai:start", { prompt: "b" });
    EventHelpers.safeEmit("ai:start", { prompt: "c" });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ prompt: "a" });
  });
});
