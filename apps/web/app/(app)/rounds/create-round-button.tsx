"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateRoundDialog } from "./create-round";

type CreateRoundButtonProps = {
  isAdmin: boolean;
};

export function CreateRoundButton({ isAdmin }: CreateRoundButtonProps) {
  const [open, setOpen] = useState(false);

  if (!isAdmin) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Create
      </Button>
      <CreateRoundDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
