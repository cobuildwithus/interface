import type { ProtocolRouteHint as ProtocolRouteHintData } from "@cobuild/wire/protocol-notifications";

type ProtocolRouteHintProps = {
  hint: ProtocolRouteHintData;
};

export function ProtocolRouteHint({ hint }: ProtocolRouteHintProps) {
  return (
    <div className="border-border/60 bg-background/80 mb-4 rounded-2xl border p-4 shadow-sm">
      <p className="text-foreground text-sm font-semibold">{hint.title}</p>
      <p className="text-muted-foreground mt-1 text-sm">{hint.description}</p>
      {hint.chips.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {hint.chips.map((chip) => (
            <span
              key={`${chip.label}:${chip.value}`}
              className="border-border/60 bg-muted/60 text-muted-foreground rounded-full border px-3 py-1 text-xs"
            >
              <span className="text-foreground font-medium">{chip.label}</span> {chip.value}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
