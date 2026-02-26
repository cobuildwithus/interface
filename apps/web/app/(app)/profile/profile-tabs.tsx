import Link from "next/link";
import { cn } from "@/lib/shared/utils";

type ProfileTabKey = "activity" | "conversation";

type ProfileTabsProps = {
  activeTab?: ProfileTabKey;
  statsContent: React.ReactNode;
  conversationContent: React.ReactNode;
  activityContent: React.ReactNode;
  holdingsContent: React.ReactNode;
};

export function ProfileTabs({
  activeTab = "activity",
  statsContent,
  conversationContent,
  activityContent,
  holdingsContent,
}: ProfileTabsProps) {
  const tabs: Array<{ key: ProfileTabKey; label: string }> = [
    { key: "activity", label: "Activity" },
    { key: "conversation", label: "Conversation" },
  ];

  return (
    <div>
      <div className="border-border flex gap-8 border-b text-base font-medium">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Link
              key={tab.key}
              href={`/profile?tab=${tab.key}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "text-muted-foreground hover:text-foreground -mb-px border-b-2 border-transparent pb-2 transition-colors",
                isActive && "text-foreground border-primary"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {activeTab === "conversation" ? (
        <>
          <div>{statsContent}</div>
          <div className="pt-6">{conversationContent}</div>
        </>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>{holdingsContent}</div>
          <div>{activityContent}</div>
        </div>
      )}
    </div>
  );
}
