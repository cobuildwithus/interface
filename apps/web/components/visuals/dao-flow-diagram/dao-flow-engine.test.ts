// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";

const { importOrder } = vi.hoisted(() => ({
  importOrder: [] as string[],
}));

vi.mock("pixi.js/unsafe-eval", () => {
  importOrder.push("pixi.js/unsafe-eval");
  return {};
});

vi.mock("pixi.js", () => {
  importOrder.push("pixi.js");
  return {
    Application: class Application {},
    Container: class Container {},
    Graphics: class Graphics {},
    Text: class Text {},
    TextStyle: class TextStyle {},
    ParticleContainer: class ParticleContainer {},
    Particle: class Particle {},
    Rectangle: class Rectangle {},
  };
});

const waitForImports = async (expectedCount: number) => {
  const timeoutAt = Date.now() + 1_000;

  while (Date.now() < timeoutAt) {
    if (importOrder.length >= expectedCount) return;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  throw new Error(`Timed out waiting for ${expectedCount} import events`);
};

describe("dao-flow-engine pixi bootstrap", () => {
  it("loads unsafe-eval before pixi", async () => {
    importOrder.length = 0;
    vi.resetModules();

    const { startDaoFlowDiagram } = await import("./dao-flow-engine");

    const stop = startDaoFlowDiagram({
      host: document.createElement("div"),
      events: [],
    });
    stop();

    await waitForImports(2);

    expect(importOrder).toEqual(["pixi.js/unsafe-eval", "pixi.js"]);
  });

  it("skips pixi bootstrap when host is missing", async () => {
    importOrder.length = 0;
    vi.resetModules();

    const { startDaoFlowDiagram } = await import("./dao-flow-engine");

    const stop = startDaoFlowDiagram({
      host: null,
      events: [],
    });
    stop();

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(importOrder).toEqual([]);
  });
});
