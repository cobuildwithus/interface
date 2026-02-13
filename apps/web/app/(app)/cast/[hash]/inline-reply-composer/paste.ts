import type { ClipboardEventHandler } from "react";

export function createImagePasteHandler(
  handleUpload: (file: File) => void
): ClipboardEventHandler<HTMLTextAreaElement> {
  return (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
      const file = item.getAsFile();
      if (file) {
        void handleUpload(file);
      }
      break;
    }
  };
}
