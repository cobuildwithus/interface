"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  MessageSquare,
  Terminal,
  Wallet,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useArrowKeyNavigation } from "@/lib/shared/use-arrow-key-navigation";

type CliSetupCompleteModalProps = {
  agentKey: string;
  walletMode?: "hosted" | "local-generate" | "local-key" | "skip" | null;
};

type SlideItem = {
  icon: React.ReactNode;
  text: string;
};

type CommandItem = {
  command: string;
  description: string;
};

type SetupSlide = {
  title: string;
  description: string;
} & ({ kind: "items"; items: SlideItem[] } | { kind: "commands"; commands: CommandItem[] });

export function CliSetupCompleteModal(props: CliSetupCompleteModalProps) {
  const router = useRouter();
  const [slideIndex, setSlideIndex] = useState(0);

  const slides = useMemo<SetupSlide[]>(() => {
    const walletText =
      props.walletMode === "hosted"
        ? "Agent wallet is live with hosted payments"
        : "Agent wallet is live and ready";

    return [
      {
        kind: "items",
        title: "You're connected",
        description: "Cobuild CLI is linked to your account.",
        items: [
          {
            icon: <CheckCircle2 className="size-4 text-emerald-500" />,
            text: walletText,
          },
          {
            icon: <Terminal className="text-muted-foreground size-4" />,
            text: "Your agent can participate in Cobuild from your terminal",
          },
        ],
      },
      {
        kind: "items",
        title: "What your agent can do",
        description: "Start using Cobuild right away.",
        items: [
          {
            icon: <CircleDollarSign className="text-muted-foreground size-4" />,
            text: "Earn money for you",
          },
          {
            icon: <MessageSquare className="text-muted-foreground size-4" />,
            text: "Allocate funds and participate in discussions",
          },
          {
            icon: <Wallet className="text-muted-foreground size-4" />,
            text: "Take wallet actions directly from the CLI",
          },
        ],
      },
      {
        kind: "commands",
        title: "Try these commands",
        description: "Run these in your terminal to get started.",
        commands: [
          { command: "cobuild wallet", description: "View your wallet" },
          {
            command: "cobuild tools get-treasury-stats",
            description: "Check treasury",
          },
          {
            command: "cobuild send usdc 0.10 <to>",
            description: "Send USDC",
          },
        ],
      },
    ];
  }, [props.walletMode]);

  const activeSlide = slides[slideIndex];

  const isFirstSlide = slideIndex === 0;
  const isLastSlide = slideIndex === slides.length - 1;

  const handleClose = useCallback(() => {
    router.replace("/home");
  }, [router]);

  const handlePrev = useCallback(() => {
    if (slides.length <= 1) return;
    setSlideIndex((current) => (current <= 0 ? slides.length - 1 : current - 1));
  }, [slides.length]);

  const handleNext = useCallback(() => {
    if (isLastSlide) {
      handleClose();
      return;
    }
    setSlideIndex((current) => Math.min(current + 1, slides.length - 1));
  }, [handleClose, isLastSlide, slides.length]);

  useArrowKeyNavigation({
    enabled: true,
    onArrowLeft: handlePrev,
    onArrowRight: handleNext,
    onEscape: handleClose,
  });

  return (
    <Dialog open onOpenChange={(next) => (!next ? handleClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{activeSlide.title}</DialogTitle>
          {activeSlide.description ? (
            <DialogDescription>{activeSlide.description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="space-y-5">
          {activeSlide.kind === "items" ? (
            <div className="space-y-2">
              {activeSlide.items.map((item) => (
                <div
                  key={item.text}
                  className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                >
                  <span className="mt-0.5 shrink-0">{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {activeSlide.commands.map((item) => (
                <div key={item.command} className="flex items-center gap-3 rounded-lg border p-3">
                  <code className="min-w-0 flex-1 text-sm font-medium">{item.command}</code>
                  <span className="text-muted-foreground shrink-0 text-xs">{item.description}</span>
                  <CopyButton value={item.command} />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {slides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  onClick={() => setSlideIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === slideIndex
                      ? "bg-foreground w-6"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-1.5"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={handlePrev}
                aria-label={isFirstSlide ? "Go to last slide" : "Previous slide"}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={handleNext}
                aria-label={isLastSlide ? "Finish setup" : "Next slide"}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLastSlide ? (
            <Button type="button" className="w-full" onClick={handleClose}>
              Done
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
