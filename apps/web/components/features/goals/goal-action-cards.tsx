"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoalChatStartButton } from "@/components/features/chat/goal-chat-start-button";
import { cards, type ActionCardCta } from "./goal-action-cards/data";

type GoalActionCardsProps = {
  goalAddress: string;
  initialDismissedCardIndices?: number[];
  persistCardReadAction?: (cardIndex: number) => Promise<boolean>;
};

const isValidCardIndex = (index: number): boolean =>
  Number.isInteger(index) && index >= 0 && index < cards.length;

function createDismissedCardsSet(indices: number[] = []): Set<number> {
  return new Set(indices.filter(isValidCardIndex));
}

const getWrappedIndex = (indices: number[], currentIndex: number, step: 1 | -1) => {
  if (!indices.length) return undefined;
  const currentVisibleIdx = indices.indexOf(currentIndex);
  if (currentVisibleIdx === -1) {
    return step > 0 ? indices[0] : indices[indices.length - 1];
  }
  const nextVisibleIdx = currentVisibleIdx + step;
  if (nextVisibleIdx < 0) return indices[indices.length - 1];
  if (nextVisibleIdx >= indices.length) return indices[0];
  return indices[nextVisibleIdx];
};

export function GoalActionCards({
  goalAddress,
  initialDismissedCardIndices = [],
  persistCardReadAction,
}: GoalActionCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedCards, setDismissedCards] = useState<Set<number>>(() =>
    createDismissedCardsSet(initialDismissedCardIndices)
  );
  const [isAcking, setIsAcking] = useState(false);
  const ackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleIndices = useMemo(
    () =>
      cards.reduce<number[]>((acc, _, i) => {
        if (!dismissedCards.has(i)) acc.push(i);
        return acc;
      }, []),
    [dismissedCards]
  );

  useEffect(() => {
    if (visibleIndices.length === 0) return;
    if (!visibleIndices.includes(currentIndex)) {
      setCurrentIndex(visibleIndices[0]!);
    }
  }, [currentIndex, visibleIndices]);

  const goNext = useCallback(() => {
    const nextIndex = getWrappedIndex(visibleIndices, currentIndex, 1);
    if (nextIndex !== undefined) {
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, visibleIndices]);

  const goPrev = useCallback(() => {
    const nextIndex = getWrappedIndex(visibleIndices, currentIndex, -1);
    if (nextIndex !== undefined) {
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, visibleIndices]);

  const persistReadState = useCallback(
    (cardIndex: number) => {
      if (!persistCardReadAction) return;
      void persistCardReadAction(cardIndex).catch(() => undefined);
    },
    [persistCardReadAction]
  );

  const handleAck = useCallback(() => {
    if (isAcking) return;
    setIsAcking(true);

    if (ackTimeoutRef.current) {
      clearTimeout(ackTimeoutRef.current);
    }

    ackTimeoutRef.current = setTimeout(() => {
      const nextIndex = getWrappedIndex(visibleIndices, currentIndex, 1);

      setDismissedCards((prev) => {
        const next = new Set(prev);
        next.add(currentIndex);
        return next;
      });
      persistReadState(currentIndex);
      if (nextIndex !== undefined && nextIndex !== currentIndex) {
        setCurrentIndex(nextIndex);
      }
      setIsAcking(false);
      ackTimeoutRef.current = null;
    }, 400);
  }, [currentIndex, visibleIndices, isAcking, persistReadState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  useEffect(() => {
    return () => {
      if (ackTimeoutRef.current) {
        clearTimeout(ackTimeoutRef.current);
      }
    };
  }, []);

  if (visibleIndices.length === 0) {
    return null;
  }

  const card = cards[currentIndex]!;
  const renderCta = (cta: ActionCardCta, variant?: "default" | "ghost") => {
    const showArrow = variant !== "ghost";
    if (cta.kind === "chat") {
      return (
        <GoalChatStartButton
          goalAddress={goalAddress}
          chatData={cta.chatData}
          initialMessage={cta.message}
          size="sm"
          variant={variant}
          className="gap-1.5"
        >
          {cta.label}
          {showArrow ? <ArrowRight className="h-3.5 w-3.5" /> : null}
        </GoalChatStartButton>
      );
    }

    return (
      <Button asChild size="sm" variant={variant} className="gap-1.5">
        <Link href={cta.href}>
          {cta.label}
          {showArrow ? <ArrowRight className="h-3.5 w-3.5" /> : null}
        </Link>
      </Button>
    );
  };

  return (
    <div className="bg-card group relative overflow-hidden rounded-xl border">
      {/* Dismiss button */}
      <button
        onClick={handleAck}
        disabled={isAcking}
        className={`absolute top-3 right-3 z-10 flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 ${
          isAcking ? "scale-110 bg-emerald-500/80" : "bg-white/20 hover:bg-white/30"
        }`}
      >
        <span>{isAcking ? "Done" : "Read"}</span>
        <Check className={`h-3 w-3 transition-transform ${isAcking ? "scale-125" : ""}`} />
      </button>

      {/* Gradient header */}
      <div className={`relative h-48 bg-gradient-to-br ${card.gradient}`}>
        {card.pattern}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        {card.headerText && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="px-6 text-center text-4xl font-bold tracking-tight text-white/90">
              {card.headerText}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {card.isExplainer ? (
          <>
            <div className="text-lg font-semibold tracking-tight">{card.value}</div>
            {card.description && (
              <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
                {card.description}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="text-4xl font-bold tracking-tight">{card.value}</div>
            <div className="text-muted-foreground mt-1 text-sm">{card.label}</div>
          </>
        )}

        {(card.cta || card.secondaryCta) && (
          <div className="mt-4 flex gap-2">
            {card.cta ? renderCta(card.cta) : null}
            {card.secondaryCta ? renderCta(card.secondaryCta, "ghost") : null}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-5 flex items-center justify-between">
          {/* Dots */}
          <div className="flex gap-1.5">
            {visibleIndices.map((originalIdx) => (
              <button
                key={originalIdx}
                onClick={() => setCurrentIndex(originalIdx)}
                className={`h-1.5 rounded-full transition-all ${
                  originalIdx === currentIndex
                    ? "bg-foreground w-6"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-1.5"
                }`}
              />
            ))}
          </div>

          {/* Arrow buttons */}
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
