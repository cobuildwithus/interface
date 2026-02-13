export type Particle = {
  id: number;
  phase: "down" | "toBudget";
  progress: number;
  targetIndex: number;
};

export type SplitDiagramProps = {
  splitPercent: number;
};
