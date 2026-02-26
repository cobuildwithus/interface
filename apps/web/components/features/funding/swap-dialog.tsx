"use client";

import { PropsWithChildren } from "react";
import { XIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Swap } from "@/components/features/funding/swap";

export function SwapDialog({ children }: PropsWithChildren) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="gap-0 overflow-hidden border-none p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <DialogHeader className="p-6 pb-0 sm:hidden">
          <DialogTitle>Buy $COBUILD</DialogTitle>
        </DialogHeader>
        <DialogClose className="absolute top-4 right-4 opacity-70 transition-opacity hover:opacity-100 sm:hidden">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        <Swap hideTitle />
        <div className="bg-background rounded-b-xl p-6 pt-0 sm:hidden">
          <DialogClose asChild>
            <Button variant="ghost" className="h-auto w-full py-4 text-lg font-bold">
              Cancel
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
