"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, Wallet, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SwapDialog } from "@/components/features/funding/swap-dialog";

type ContributeDialogProps = {
  children: React.ReactNode;
  goalTitle?: string;
};

type ContributeOptionProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconWrapperClassName: string;
  onClick: () => void;
};

function ContributeOption({
  title,
  description,
  icon,
  iconWrapperClassName,
  onClick,
}: ContributeOptionProps) {
  return (
    <button
      onClick={onClick}
      className="hover:bg-muted group flex items-center gap-4 rounded-xl border p-4 text-left transition-colors"
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconWrapperClassName}`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        <div className="text-muted-foreground text-sm">{description}</div>
      </div>
      <ArrowRight className="text-muted-foreground h-5 w-5 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export function ContributeDialog({ children, goalTitle }: ContributeDialogProps) {
  const [open, setOpen] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const router = useRouter();
  const params = useParams();
  const resolvedGoalTitle = goalTitle ?? "this goal";

  const handleContributeTime = () => {
    setOpen(false);
    const goalAddress = params.goalAddress as string;
    router.push(`/${goalAddress}/allocate`);
  };

  const handleFund = () => {
    setOpen(false);
    setShowSwap(true);
  };

  const options: ContributeOptionProps[] = [
    {
      title: "Contribute time",
      description: "Offer your skills and energy",
      iconWrapperClassName: "bg-amber-500/10",
      icon: <Clock className="h-6 w-6 text-amber-600 dark:text-amber-500" />,
      onClick: handleContributeTime,
    },
    {
      title: "Fund this goal",
      description: "Back with funds and earn a say",
      iconWrapperClassName: "bg-emerald-500/10",
      icon: <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />,
      onClick: handleFund,
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contribute to {resolvedGoalTitle}</DialogTitle>
          </DialogHeader>

          <div className="mt-2 flex flex-col gap-3">
            {options.map(({ title, description, icon, iconWrapperClassName, onClick }) => (
              <ContributeOption
                key={title}
                title={title}
                description={description}
                icon={icon}
                iconWrapperClassName={iconWrapperClassName}
                onClick={onClick}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Swap Dialog - rendered separately so it can open after contribute dialog closes */}
      <SwapDialog>
        <button
          ref={(el) => {
            if (showSwap && el) {
              el.click();
              setShowSwap(false);
            }
          }}
          className="hidden"
          aria-hidden
        />
      </SwapDialog>
    </>
  );
}

export function ContributeButton({ goalTitle }: { goalTitle?: string }) {
  return (
    <ContributeDialog goalTitle={goalTitle}>
      <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-lg px-4 font-medium">
        Contribute
      </Button>
    </ContributeDialog>
  );
}
