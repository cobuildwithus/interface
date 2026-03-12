import { getClipboardImageFiles } from "@/lib/integrations/images/upload-flow";

export function getChatAttachmentDropLimit(maxAttachments?: number) {
  return maxAttachments ?? 2;
}

export function getChatAttachmentPasteFiles({
  items,
  maxAttachments,
}: {
  items: DataTransferItemList | null | undefined;
  maxAttachments?: number;
}) {
  return getClipboardImageFiles(items).slice(
    0,
    Math.min(2, getChatAttachmentDropLimit(maxAttachments))
  );
}
