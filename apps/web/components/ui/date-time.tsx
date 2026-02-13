"use client";

import { HTMLProps, useEffect, useState } from "react";

interface Props extends Omit<HTMLProps<HTMLTimeElement>, "dateTime"> {
  date: Date;
  locale?: Intl.LocalesArgument;
  relative?: boolean;
  short?: boolean;
}

export function DateTime(props: Props) {
  const { date, locale = "en-US", relative = false, short = false, ...rest } = props;
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    if (!relative) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const startInterval = () => {
      if (interval) return;
      setCurrentDate(new Date());
      interval = setInterval(() => setCurrentDate(new Date()), 10_000);
    };

    const stopInterval = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        startInterval();
      }
    };

    startInterval();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [relative]);

  return (
    <time dateTime={date.toISOString()} title={date.toString()} suppressHydrationWarning {...rest}>
      {relative ? getRelativeTime(date, currentDate, locale, short) : date.toLocaleString(locale)}
    </time>
  );
}

function stripRelativeAffixes(value: string) {
  const core = value
    .replace(/\s*ago$/i, "")
    .replace(/^\s*in\s+/i, "")
    .trim();
  return core.replace(/\s+/g, "");
}

function getRelativeTime(
  date: Date,
  currentDate: Date,
  locale: Intl.LocalesArgument = "en-US",
  short = false
) {
  const diff = date.getTime() - currentDate.getTime();
  const formatter = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
    style: short ? "narrow" : "long",
  });

  const absDiff = Math.abs(diff);
  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours >= 48) {
    const days = Math.floor(hours / 24);
    if (days >= 60) {
      const months = Math.floor(days / 30);
      return stripRelativeAffixes(formatter.format(diff >= 0 ? months : -months, "month"));
    }
    return stripRelativeAffixes(formatter.format(diff >= 0 ? days : -days, "day"));
  }

  if (hours >= 24) {
    return diff >= 0 ? "tomorrow" : "1d";
  }

  if (hours > 0) return stripRelativeAffixes(formatter.format(diff >= 0 ? hours : -hours, "hour"));
  if (minutes > 0)
    return stripRelativeAffixes(formatter.format(diff >= 0 ? minutes : -minutes, "minute"));
  return stripRelativeAffixes(formatter.format(diff >= 0 ? seconds : -seconds, "second"));
}
