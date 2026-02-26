"use client";

import { CheckCircle2, AtSign, Link2, Hash, FileText } from "lucide-react";
import type { RoundHardRequirement } from "./types";

type RoundEarnDefaultContentProps = {
  title?: string;
  description?: string | null;
  requirements?: RoundHardRequirement[];
};

const REQUIREMENT_ICONS: Record<RoundHardRequirement["type"], typeof AtSign> = {
  mentionsAll: AtSign,
  embedUrlPattern: Link2,
  channelId: Hash,
  text: FileText,
};

export function RoundEarnDefaultContent({
  title,
  description,
  requirements = [],
}: RoundEarnDefaultContentProps) {
  return (
    <div className="space-y-4">
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      {description && <p className="text-muted-foreground text-sm">{description}</p>}

      {requirements.length > 0 && (
        <div className="space-y-2">
          <p className="text-foreground/80 text-sm font-medium">Requirements</p>
          <ul className="space-y-2">
            {requirements.map((req, i) => {
              const Icon = REQUIREMENT_ICONS[req.type] ?? CheckCircle2;
              return (
                <li key={i} className="text-muted-foreground flex items-start gap-2 text-sm">
                  <Icon className="text-foreground/60 mt-0.5 size-4 shrink-0" />
                  <span>{req.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
