import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ContributeButton } from "@/components/features/goals/contribute-dialog";
import { getGoalOverviewData } from "@/lib/domains/goals/goal-data";
import { GoalNav } from "./goal-nav";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ goalAddress: string }>;
};

export default async function GoalLayout({ children, params }: LayoutProps) {
  const { goalAddress } = await params;
  const overview = await getGoalOverviewData(goalAddress);
  const raisedLabel = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(overview?.raised ?? 0)));

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
        <div className="flex items-center gap-4 px-4 py-3 md:px-6">
          <ScrollArea className="min-w-0 flex-1">
            <GoalNav goalAddress={goalAddress} />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <div className="flex shrink-0 items-center gap-3">
            <div className="text-muted-foreground text-sm">
              <span className="text-foreground font-medium">{raisedLabel}</span> raised
            </div>
            <ContributeButton goalTitle={overview?.goal.name} />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
