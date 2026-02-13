"use client";

import type { ReactNode } from "react";
import { getFarcasterProfileUrl } from "@/lib/integrations/farcaster/urls";

// URL regex that matches http(s) URLs and bare domains (e.g., co.build, docs.co.build/path)
const URL_REGEX =
  /(https?:\/\/[^\s<]+[^\s<.,;:!?"'\])}>]|(?:^|(?<=\s))(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s<]*[^\s<.,;:!?"'\])}>])?)/g;
// Allow dotted/ENS-style usernames (e.g. @alice.eth) without swallowing trailing punctuation.
const MENTION_REGEX = /(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_](?:[a-zA-Z0-9_.-]*[a-zA-Z0-9_])?)/g;

export function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(URL_REGEX);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return part;
        const isUrl = i % 2 === 1;
        if (isUrl) {
          const href = part.startsWith("http") ? part : `https://${part}`;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-70"
            >
              {part}
            </a>
          );
        }

        const mentionRegex = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags);
        const mentions: ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = mentionRegex.exec(part)) !== null) {
          const prefixLength = match[1].length;
          const username = match[2];
          const mentionStart = match.index + prefixLength;
          const mentionText = `@${username}`;

          if (mentionStart > lastIndex) {
            mentions.push(part.slice(lastIndex, mentionStart));
          }

          mentions.push(
            <a
              key={`mention-${i}-${mentionStart}`}
              href={getFarcasterProfileUrl(username)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary no-underline hover:underline"
            >
              {mentionText}
            </a>
          );

          lastIndex = mentionStart + mentionText.length;
        }

        if (lastIndex < part.length) {
          mentions.push(part.slice(lastIndex));
        }

        if (!mentions.length) return part;

        return (
          <span key={i} className="whitespace-pre-wrap">
            {mentions}
          </span>
        );
      })}
    </>
  );
}
