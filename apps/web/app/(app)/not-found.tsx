import { Compass } from "lucide-react";
import { GridBackground } from "@/components/ui/grid-background";
import { NotFoundHomeButton } from "@/components/common/not-found-home-button";

export default function NotFound() {
  return (
    <main className="relative min-h-screen w-full">
      <GridBackground />
      <div className="relative flex min-h-screen w-full items-center justify-center px-6 py-16">
        <div className="bg-card/80 flex w-full max-w-lg flex-col items-center rounded-2xl border p-8 text-center shadow-sm backdrop-blur">
          <div className="bg-background/70 text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-full border">
            <Compass className="size-5" />
          </div>
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.22em] uppercase">
            404
          </p>
          <h1 className="mt-2 text-2xl font-semibold">We couldn&apos;t find that page</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Double-check the URL, or jump back to a place that’s definitely still here.
          </p>
          <div className="mt-6">
            <NotFoundHomeButton />
          </div>
        </div>
      </div>
    </main>
  );
}
