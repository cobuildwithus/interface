export type ReplyContextItem = {
  id: string;
  messageKey: string;
  text: string;
};

const formatQuotedLine = (line: string) => `> ${line}`;

export const formatReplyQuote = (text: string) =>
  text
    .trim()
    .split("\n")
    .map((line) => formatQuotedLine(line))
    .join("\n");

export const buildReplyPrefix = (items: ReplyContextItem[]) =>
  items.map((item) => formatReplyQuote(item.text)).join("\n\n");
