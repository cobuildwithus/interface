export const STREAMDOWN_BASE_CLASS =
  "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 " +
  "[&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 " +
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 " +
  "[&_li]:leading-relaxed";

export const STREAMDOWN_COMPACT_CLASS = `${STREAMDOWN_BASE_CLASS} [&_p]:my-0`;
