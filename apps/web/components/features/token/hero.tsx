export function TokenHero() {
  return (
    <section className="border-border relative isolation-auto overflow-hidden border-b md:flex md:h-[calc(100vh-64px)] md:max-h-[800px] md:items-center">
      <div className="relative z-10 container mx-auto px-4 py-12">
        <h1 className="text-foreground text-[14vw] leading-[0.85] font-black tracking-tighter uppercase md:mt-24 md:text-[10vw]">
          $COBUILD
        </h1>

        <div className="bg-foreground mt-12 h-4 w-full" />

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7 lg:col-span-8">
            <h2 className="text-foreground text-4xl leading-[1.1] font-medium tracking-tight text-pretty md:text-6xl">
              A new type of organization is necessary for the intelligence age.
            </h2>
          </div>

          <div className="flex flex-col justify-between gap-8 md:col-span-5 lg:col-span-4">
            <div className="space-y-6">
              <div className="bg-foreground/20 h-1 w-12"></div>
              <p className="text-muted-foreground text-lg leading-relaxed font-medium text-pretty md:text-xl">
                Cobuild is a launchpad for contributor-owned organizations capable of large-scale
                collective action in the world.
              </p>
            </div>

            <div className="hidden md:block">
              <p className="text-muted-foreground mb-2 font-mono text-xs tracking-widest uppercase">
                Launch date
              </p>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-yellow-500"></span>
                <span className="text-sm font-medium">Coming soon</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
