import { Header } from "@/components/layout/header";
import { TokenHero } from "@/components/features/token/hero";
import { TokenStats } from "@/components/features/token/stats";
import { BuySection } from "@/components/features/token/buy-section";
import { LaunchpadSection } from "@/components/features/token/launchpad-section";
import { BuilderFundingSection } from "@/components/features/token/builder-funding-section";
import { TokenFAQ } from "@/components/features/token/faq";
import { TokenFooter } from "@/components/features/token/footer";
import { getUser } from "@/lib/domains/auth/session";
import { getRevnetData } from "@/lib/domains/token/onchain/revnet-data";
import { buildPageMetadata } from "@/lib/shared/page-metadata";

export const metadata = buildPageMetadata({
  title: "Cobuild Token | Launching Soon",
  description:
    "The Cobuild token is designed to coordinate participation in the Cobuild ecosystem. Launching soon.",
});

export default async function TokenPage() {
  const [address, revnetData] = await Promise.all([getUser(), getRevnetData()]);

  return (
    <div className="min-h-screen">
      <Header variant="solid" showConnect address={address} />

      <main className="pt-16">
        <TokenHero />
        <TokenStats />
        <BuySection />
        <LaunchpadSection />
        <BuilderFundingSection reservedPercent={revnetData.reservedPercent} />
        <TokenFAQ />
      </main>

      <TokenFooter />
    </div>
  );
}
