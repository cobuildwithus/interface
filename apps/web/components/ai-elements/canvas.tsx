"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { BackgroundProps, ReactFlowProps } from "@xyflow/react";

type CanvasProps = ReactFlowProps & {
  children?: ReactNode;
};

const ReactFlow = dynamic<ReactFlowProps>(async () => (await import("@xyflow/react")).ReactFlow, {
  ssr: false,
});

const Background = dynamic<BackgroundProps>(
  async () => (await import("@xyflow/react")).Background,
  { ssr: false }
);

export const Canvas = ({ children, ...props }: CanvasProps) => (
  <ReactFlow
    deleteKeyCode={["Backspace", "Delete"]}
    fitView
    panOnDrag={false}
    panOnScroll
    selectionOnDrag={true}
    zoomOnDoubleClick={false}
    {...props}
  >
    <Background bgColor="var(--sidebar)" />
    {children}
  </ReactFlow>
);
