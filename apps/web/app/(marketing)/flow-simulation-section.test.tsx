// @vitest-environment happy-dom

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
  it("places the optional hash target on the visible content wrapper", () => {
    render(<FlowSimulationSection sectionId="how-it-works" />);

    const anchorTarget = document.getElementById("how-it-works");

    expect(anchorTarget).not.toBeNull();
    expect(anchorTarget?.className).toContain("scroll-mt-32");
  });
});
