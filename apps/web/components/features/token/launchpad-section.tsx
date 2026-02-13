import { LaunchpadOrbit } from "@/components/visuals/launchpad-orbit";

export function LaunchpadSection() {
  return (
    <section className="border-border bg-muted/20 overflow-hidden border-b py-24">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="relative z-10 order-2 lg:order-1">
            <h2 className="mb-8 text-4xl font-black tracking-tighter text-balance uppercase md:text-6xl">
              A LAUNCHPAD FOR
              <br />
              <span className="text-muted-foreground">COMMUNITIES</span>
            </h2>

            <div className="space-y-12">
              <p className="text-foreground/90 max-w-xl text-xl leading-relaxed font-medium text-pretty">
                Cobuild is infrastructure for the next generation of community-owned organizations.
                $COBUILD sits at the center of the economy.
              </p>

              <div className="space-y-8">
                <div className="border-border hover:border-foreground group relative border-l-2 pl-8 transition-colors duration-300">
                  <h3 className="mb-2 text-xl font-bold transition-transform group-hover:translate-x-1">
                    Networks Denominated in $COBUILD
                  </h3>
                  <p className="text-muted-foreground text-base leading-relaxed text-pretty">
                    Every community launched on Cobuild uses $COBUILD as its base trading pair. LP
                    fees and network activity route value back to the $COBUILD network.
                  </p>
                </div>

                <div className="border-border hover:border-foreground group relative border-l-2 pl-8 transition-colors duration-300">
                  <h3 className="mb-2 text-xl font-bold transition-transform group-hover:translate-x-1">
                    Revenue Drives the Floor
                  </h3>
                  <p className="text-muted-foreground text-base leading-relaxed text-pretty">
                    Real economic activity—fees, sales, usage—flows into the treasury. The floor
                    rises when the network earns, not just when new buyers arrive.
                  </p>
                </div>

                <div className="border-border hover:border-foreground group relative border-l-2 pl-8 transition-colors duration-300">
                  <h3 className="mb-2 text-xl font-bold transition-transform group-hover:translate-x-1">
                    Work-to-Earn
                  </h3>
                  <p className="text-muted-foreground text-base leading-relaxed text-pretty">
                    Builders earn tokens through meaningful contribution, verified by AI-driven
                    curation markets. Paying those who ship real work.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 flex items-center justify-center py-12 lg:order-2 lg:py-0">
            <LaunchpadOrbit />
          </div>
        </div>
      </div>
    </section>
  );
}
