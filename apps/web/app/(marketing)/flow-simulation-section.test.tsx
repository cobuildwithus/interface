// @vitest-environment happy-dom

import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlowSimulationSection } from "./flow-simulation-section";

vi.mock("@/components/common/goal-topic-toggle", () => ({
  GoalTopicToggle: ({ value }: { value: string }) => (
    <div data-testid="goal-topic-toggle">{value}</div>
  ),
}));

vi.mock("@/components/visuals/dao-flow-diagram/dao-flow-diagram", () => ({
  DaoFlowDiagram: ({ height }: { height: number }) => (
    <div data-testid="dao-flow-diagram">{height}</div>
  ),
}));

describe("FlowSimulationSection", () => {
  const originalInnerHeight = window.innerHeight;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 900,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 500,
      writable: true,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: originalInnerHeight,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: originalMatchMedia,
    });
    window.history.replaceState(null, "", "/");
    vi.restoreAllMocks();
  });

  it("places the optional hash target on the visible content wrapper", () => {
    render(<FlowSimulationSection sectionId="how-it-works" />);

    const anchorTarget = document.getElementById("how-it-works");

    expect(anchorTarget).not.toBeNull();
    expect(anchorTarget?.className).toContain("scroll-mt-32");
  });

  it("intercepts matching hash links and scrolls to the computed landing offset", () => {
    render(<FlowSimulationSection sectionId="how-it-works" />);

    const anchorTarget = document.getElementById("how-it-works");
    expect(anchorTarget).not.toBeNull();

    Object.defineProperty(anchorTarget as HTMLElement, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        top: 420,
        left: 0,
        width: 0,
        height: 0,
        right: 0,
        bottom: 0,
        x: 0,
        y: 420,
        toJSON: () => null,
      }),
    });

    const trigger = document.createElement("a");
    trigger.href = "#how-it-works";
    trigger.textContent = "How It Works";
    document.body.appendChild(trigger);

    fireEvent.click(trigger);

    expect(window.history.state).toBeNull();
    expect(window.location.hash).toBe("#how-it-works");
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 760,
      behavior: "smooth",
    });
  });
});
