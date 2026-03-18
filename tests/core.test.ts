import { describe, it, expect } from "vitest";
import { Novamind } from "../src/core.js";
describe("Novamind", () => {
  it("init", () => { expect(new Novamind().getStats().ops).toBe(0); });
  it("op", async () => { const c = new Novamind(); await c.process(); expect(c.getStats().ops).toBe(1); });
  it("reset", async () => { const c = new Novamind(); await c.process(); c.reset(); expect(c.getStats().ops).toBe(0); });
});
