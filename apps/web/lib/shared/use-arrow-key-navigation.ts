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
  useEffect(() => {
    if (!options.enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      if (event.key === "ArrowLeft" && options.onArrowLeft) {
        event.preventDefault();
        options.onArrowLeft();
        return;
      }
      if (event.key === "ArrowRight" && options.onArrowRight) {
        event.preventDefault();
        options.onArrowRight();
        return;
      }
      if (event.key === "Escape" && options.onEscape) {
        event.preventDefault();
        options.onEscape();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [options.enabled, options.onArrowLeft, options.onArrowRight, options.onEscape]);
}
