"use client";

import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/shared/utils";
import type { ComponentProps } from "react";

const formatHostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
};

export type InlineCitationProps = ComponentProps<"span">;

export const InlineCitation = ({ className, ...props }: InlineCitationProps) => (
  <span className={cn("group inline items-center gap-1", className)} {...props} />
);

export type InlineCitationTextProps = ComponentProps<"span">;

export const InlineCitationText = ({ className, ...props }: InlineCitationTextProps) => (
  <span className={cn("group-hover:bg-accent transition-colors", className)} {...props} />
);

export type InlineCitationCardProps = ComponentProps<typeof HoverCard>;

export const InlineCitationCard = (props: InlineCitationCardProps) => (
  <HoverCard closeDelay={0} openDelay={0} {...props} />
);

export type InlineCitationCardTriggerProps = ComponentProps<typeof Badge> & {
  sources: string[];
};

export const InlineCitationCardTrigger = ({
  sources,
  className,
  ...props
}: InlineCitationCardTriggerProps) => (
  <HoverCardTrigger asChild>
    <Badge className={cn("ml-1 rounded-full", className)} variant="secondary" {...props}>
      {sources[0] ? (
        <>
          {formatHostname(sources[0])} {sources.length > 1 && `+${sources.length - 1}`}
        </>
      ) : (
        "unknown"
      )}
    </Badge>
  </HoverCardTrigger>
);

export type InlineCitationCardBodyProps = ComponentProps<"div">;

export const InlineCitationCardBody = ({ className, ...props }: InlineCitationCardBodyProps) => (
  <HoverCardContent className={cn("relative w-80 p-0", className)} {...props} />
);
