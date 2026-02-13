"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import type { ReplyContextItem } from "@/lib/domains/chat/reply-context";

type SelectionState = {
  text: string;
  messageKey: string;
  rect: DOMRect;
};

export type SelectionReplyPosition = {
  top: number;
  left: number;
  transform: string;
};

type UseSelectionReplyOptions = {
  containerRef: RefObject<HTMLElement | null>;
  onQuoteSelection: (payload: Omit<ReplyContextItem, "id">) => void;
  offset?: number;
  minChars?: number;
};

const getSelectionPosition = (
  selection: SelectionState,
  offset: number
): SelectionReplyPosition => {
  const shouldPlaceAbove = selection.rect.top > 64;
  const top = shouldPlaceAbove ? selection.rect.top - offset : selection.rect.bottom + offset;
  return {
    top,
    left: selection.rect.left + selection.rect.width / 2,
    transform: shouldPlaceAbove ? "translate(-50%, -100%)" : "translate(-50%, 0)",
  };
};

export function useSelectionReply({
  containerRef,
  onQuoteSelection,
  offset = 10,
  minChars = 3,
}: UseSelectionReplyOptions) {
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const selectionPosition = selection ? getSelectionPosition(selection, offset) : null;

  const clearSelection = useCallback((shouldClearRanges = false) => {
    setSelection(null);
    if (!shouldClearRanges) return;
    window.getSelection()?.removeAllRanges();
  }, []);

  const updateSelection = useCallback(() => {
    const activeSelection = window.getSelection();
    if (!activeSelection || activeSelection.rangeCount === 0 || activeSelection.isCollapsed) {
      clearSelection();
      return;
    }

    const text = activeSelection.toString().trim();
    if (!text || text.length < minChars) {
      clearSelection();
      return;
    }

    const range = activeSelection.getRangeAt(0);
    const listEl = containerRef.current;
    if (!listEl || !listEl.contains(range.commonAncestorContainer)) {
      clearSelection();
      return;
    }

    const startElement =
      range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : (range.startContainer as Element | null);
    const messageElement = startElement?.closest<HTMLElement>("[data-message-key]") ?? null;
    const messageKey = messageElement?.dataset.messageKey ?? "";
    if (!messageKey) {
      clearSelection();
      return;
    }

    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      clearSelection();
      return;
    }

    setSelection({ text, messageKey, rect });
  }, [clearSelection, containerRef, minChars]);

  useEffect(() => {
    const handleScroll = () => {
      if (!selection) return;
      updateSelection();
    };

    document.addEventListener("selectionchange", updateSelection);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updateSelection);
    return () => {
      document.removeEventListener("selectionchange", updateSelection);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updateSelection);
    };
  }, [selection, updateSelection]);

  useEffect(() => {
    const handlePointerDown = () => setIsPointerDown(true);
    const handlePointerUp = () => setIsPointerDown(false);

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("blur", handlePointerUp);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("blur", handlePointerUp);
    };
  }, []);

  const handleReply = useCallback(() => {
    if (!selection) return;
    onQuoteSelection({ messageKey: selection.messageKey, text: selection.text });
    clearSelection(true);
  }, [clearSelection, onQuoteSelection, selection]);

  const hasSelection = Boolean(selection) && !isPointerDown;

  return { selectionPosition, hasSelection, handleReply };
}
