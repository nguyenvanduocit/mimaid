import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("vitest is wired up", () => {
    expect(1 + 1).toBe(2);
  });

  it("jsdom provides window", () => {
    expect(typeof window).toBe("object");
    expect(typeof window.localStorage).toBe("object");
  });
});
