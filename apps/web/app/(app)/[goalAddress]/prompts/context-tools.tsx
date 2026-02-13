import { Database, Globe } from "lucide-react";

function FarcasterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1000 1000" fill="currentColor" className={className}>
      <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z" />
      <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z" />
      <path d="M675.556 746.667C663.283 746.667 653.333 756.616 653.333 768.889V795.556H648.889C636.616 795.556 626.667 805.505 626.667 817.778V844.444H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z" />
    </svg>
  );
}

const sections = [
  {
    label: "Farcaster",
    icon: FarcasterIcon,
    tools: [
      {
        title: "Get user details",
        description: "Lookup username, FID, and verified addresses",
      },
      {
        title: "Get cast",
        description: "Fetch a cast by hash or URL",
      },
      {
        title: "Cast preview",
        description: "Preview before publishing",
      },
    ],
  },
  {
    label: "Web",
    icon: Globe,
    tools: [
      {
        title: "Web search",
        description: "Search the public web",
      },
      {
        title: "Read docs",
        description: "Search Cobuild documentation",
      },
    ],
  },
  {
    label: "Onchain Data",
    icon: Database,
    tools: [
      {
        title: "Live stats",
        description: "Treasury, issuance, and holder metrics",
      },
    ],
  },
];

export function ContextTools() {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.label}>
          <div className="mb-3 flex items-center gap-2">
            <section.icon className="text-muted-foreground h-3.5 w-3.5" />
            <h4 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {section.label}
            </h4>
          </div>
          <div className="space-y-4">
            {section.tools.map((tool) => (
              <div key={tool.title}>
                <h3 className="font-medium">{tool.title}</h3>
                <p className="text-muted-foreground mt-0.5 text-sm">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
