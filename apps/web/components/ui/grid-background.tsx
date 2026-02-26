export function GridBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
      style={{
        backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                         linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    />
  );
}
