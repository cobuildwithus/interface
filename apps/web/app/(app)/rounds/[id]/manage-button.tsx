"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManageRoundDialog } from "./manage-round-dialog";
import type { RoundVariant } from "@/lib/domains/rounds/config";

type ManageButtonProps = {
  roundId: string;
  roundTitle: string | null;
  roundDescription: string | null;
  startAt: string | null;
  endAt: string | null;
  variant: RoundVariant;
  rule: {
    id: number;
    outputTag: string;
    requirementsText: string | null;
    ctaText: string | null;
    castTemplate: string | null;
    perUserLimit: number | null;
    admins: string[];
  };
  isAdmin: boolean;
};

export function ManageButton({
  roundId,
  roundTitle,
  roundDescription,
  startAt,
  endAt,
  variant,
  rule,
  isAdmin,
}: ManageButtonProps) {
  const [open, setOpen] = useState(false);

  if (!isAdmin) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="size-4" />
        Manage
      </Button>
      <ManageRoundDialog
        roundId={roundId}
        roundTitle={roundTitle}
        roundDescription={roundDescription}
        startAt={startAt}
        endAt={endAt}
        variant={variant}
        rule={rule}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
