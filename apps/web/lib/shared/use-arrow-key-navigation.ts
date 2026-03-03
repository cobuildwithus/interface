"use client";

import { useEffect } from "react";

type ArrowKeyNavigationOptions = {
  enabled: boolean;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEscape?: () => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

export function useArrowKeyNavigation(options: ArrowKeyNavigationOptions) {
  const { enabled, onArrowLeft, onArrowRight, onEscape } = options;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      if (event.key === "ArrowLeft" && onArrowLeft) {
        event.preventDefault();
        onArrowLeft();
        return;
      }
      if (event.key === "ArrowRight" && onArrowRight) {
        event.preventDefault();
        onArrowRight();
        return;
      }
      if (event.key === "Escape" && onEscape) {
        event.preventDefault();
        onEscape();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onArrowLeft, onArrowRight, onEscape]);
}
