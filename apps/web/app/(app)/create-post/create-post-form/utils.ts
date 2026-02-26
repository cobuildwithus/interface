export function createAttachmentId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `attachment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
