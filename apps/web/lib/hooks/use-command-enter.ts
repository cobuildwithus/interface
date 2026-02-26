"use client";

import { useCallback, type KeyboardEvent } from "react";

type CommandEnterHandler = (event: KeyboardEvent<HTMLElement>) => void;

export function useCommandEnter(onSubmit: () => void, enabled = true): CommandEnterHandler {
  return useCallback(
    (event) => {
      if (!enabled) return;
      if (event.nativeEvent?.isComposing) return;
      if (event.key !== "Enter") return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      onSubmit();
    },
    [enabled, onSubmit]
  );
}
