import Link from "next/link";
import { CapitalOrbit } from "@/components/visuals/capital-orbit/capital-orbit";
import { FlywheelDiagram } from "@/components/visuals/flywheel/flywheel-diagram";
import { GlossaryTerm } from "@/components/common/glossary-term";
import { Socials } from "@/components/common/socials";
import { docsUrl } from "@/lib/config/docs";
import { Header } from "@/components/layout/header";
import { FlowSimulationSection } from "@/app/(marketing)/flow-simulation-section";
import { buildPageMetadata } from "@/lib/shared/page-metadata";

export const metadata = buildPageMetadata({
  title: "Cobuild | Crowdfund Software You Wish Existed",
  description:
    "Cobuild helps communities raise money for new software, maintenance, and features, then pay contributors to build and maintain it.",
});

const whatIsCobuildDocsUrl = `${docsUrl}/quickstart/what-is-cobuild`;

export default async function Home() {
  return (
    <div className="dark bg-black text-white selection:bg-white selection:text-black">
      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_32%),radial-gradient(circle_at_78%_24%,_rgba(255,255,255,0.06),_transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_24%)]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(to right, white 1px, transparent 1px),
                linear-gradient(to bottom, white 1px, transparent 1px)
              `,
              backgroundSize: "96px 96px",
            }}
          />
        </div>
        <Header />

        <main className="relative z-10 flex flex-1 items-center">
          <div className="w-full px-8 md:px-16 lg:px-24">
            <div className="max-w-4xl">
              <div className="space-y-8">
                <h1 className="max-w-4xl text-4xl leading-[1.04] font-bold tracking-tight uppercase sm:text-5xl sm:leading-[0.98] md:text-6xl lg:text-7xl">
                  Crowdfund software you wish existed.
                </h1>

                <p className="max-w-2xl text-sm leading-relaxed text-neutral-300 md:text-base">
                  Cobuild helps communities raise money for new software, maintenance, and features,
                  then pay contributors to build and maintain it.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <Link
                    href="#how-it-works"
                    className="group inline-flex items-center gap-3 rounded-md bg-white px-6 py-3 text-sm font-medium tracking-widest text-black uppercase transition-all duration-300 hover:bg-neutral-200"
                  >
                    See How It Works
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      className="size-4 transition-transform group-hover:translate-y-0.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m0 0 6-6m-6 6-6-6"
                      />
                    </svg>
                  </Link>

                  <Link
                    href={whatIsCobuildDocsUrl}
                    className="group inline-flex items-center gap-3 rounded-md border border-neutral-600 px-6 py-3 text-sm font-medium tracking-widest uppercase transition-all duration-300 hover:border-white hover:bg-white hover:text-black"
                  >
                    Read Docs
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      className="size-4 transition-transform group-hover:translate-x-1"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </Link>
                </div>
              </div>

              <div className="mt-12 flex flex-wrap items-center gap-6 border-t border-white/10 pt-8 md:mt-16 md:gap-8">
                <div>
                  <span className="block text-xl font-bold tracking-tight md:text-2xl">$200k+</span>
                  <span className="text-[11px] tracking-widest text-neutral-500 uppercase">
                    routed
                  </span>
                </div>
                <div className="hidden h-8 w-px bg-neutral-800 md:block" />
                <div>
                  <span className="block text-xl font-bold tracking-tight md:text-2xl">400+</span>
                  <span className="text-[11px] tracking-widest text-neutral-500 uppercase">
                    contributors paid
                  </span>
                </div>
                <div className="hidden h-8 w-px bg-neutral-800 md:block" />
                <div>
                  <span className="block text-xl font-bold tracking-tight md:text-2xl">94%</span>
                  <span className="text-[11px] tracking-widest text-neutral-500 uppercase">
                    completion rate
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </section>

      <div id="how-it-works">
        <FlowSimulationSection />
      </div>

      {/* Flywheel Section */}
      <section className="relative min-h-screen overflow-hidden px-8 pt-16 pb-24 md:px-16 lg:px-24">
        {/* Corner markers */}
        <div className="pointer-events-none absolute top-4 left-4 h-12 w-12 border-t border-l border-neutral-800 md:top-8 md:left-12 md:h-16 md:w-16" />
        <div className="pointer-events-none absolute top-4 right-4 h-12 w-12 border-t border-r border-neutral-800 md:top-8 md:right-12 md:h-16 md:w-16" />
        <div className="pointer-events-none absolute bottom-4 left-4 h-12 w-12 border-b border-l border-neutral-800 md:bottom-8 md:left-12 md:h-16 md:w-16" />
        <div className="pointer-events-none absolute right-4 bottom-4 h-12 w-12 border-r border-b border-neutral-800 md:right-12 md:bottom-8 md:h-16 md:w-16" />

        {/* Subtle grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, white 1px, transparent 1px),
              linear-gradient(to bottom, white 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
          }}
        />

        {/* Section header */}
        <div className="relative z-10 mb-12 max-w-xl md:mb-16">
          <h2 className="text-2xl leading-[1.1] font-bold tracking-tight uppercase sm:text-3xl md:text-4xl lg:text-5xl">
            Attention Becomes
            <br />
            <span className="text-neutral-500">Capital Becomes</span>
            <br />
            Impact
          </h2>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-5xl">
          <FlywheelDiagram />
        </div>
      </section>

      {/* Mission Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-8 md:px-16 lg:px-24">
        <CapitalOrbit />
        <div className="relative z-10 max-w-4xl space-y-8">
          <h2 className="text-4xl leading-[1.08] font-bold tracking-tight uppercase sm:text-5xl sm:leading-[1.02] md:text-6xl lg:text-7xl">
            Making Capital
            <br />
            Serve Culture
          </h2>

          <p className="max-w-xl text-sm leading-relaxed text-neutral-400 md:text-base">
            We believe a future with millions of{" "}
            <GlossaryTerm
              term="DAOs"
              title="Decentralized Autonomous Organization"
              definition="An organization where the rules for spending money and making decisions are written in public code and enforced automatically."
            />{" "}
            doing meaningful work that benefits humanity is fundamentally more exciting than one
            without.
          </p>

          <Link
            href={whatIsCobuildDocsUrl}
            className="group inline-flex items-center gap-3 rounded-md border border-neutral-600 px-6 py-3 text-sm font-medium tracking-widest uppercase transition-all duration-300 hover:border-white hover:bg-white hover:text-black"
          >
            Docs
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="size-4 transition-transform group-hover:translate-x-1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12">
        <Socials />
      </footer>
    </div>
  );
}
