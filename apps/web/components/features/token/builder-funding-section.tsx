import { SplitDiagram } from "./split-diagram";

interface BuilderFundingSectionProps {
  reservedPercent: number;
}

export function BuilderFundingSection({ reservedPercent }: BuilderFundingSectionProps) {
  const splitPercent = Math.round(reservedPercent / 100);

  return (
    <section className="border-border bg-background border-b py-24">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="mb-6 text-4xl font-black tracking-tighter uppercase md:text-6xl">
              AUTOMATIC
              <br />
              <span className="text-muted-foreground">FUNDING</span>
            </h2>
            <p className="text-muted-foreground max-w-lg text-xl leading-relaxed text-pretty">
              {splitPercent}% of new mints fund builders to help grow the network. When you buy, you
              choose which budgets receive your share.
            </p>
          </div>

          <div className="flex justify-center">
            <SplitDiagram splitPercent={splitPercent} />
          </div>
        </div>
      </div>
    </section>
  );
}
