"use client";

import { createContext, useContext, useMemo, useState } from "react";

type NotificationsUnreadContextValue = {
  unreadCount: number;
  markAllRead: (watermark: string) => void;
};

const NotificationsUnreadContext = createContext<NotificationsUnreadContextValue | null>(null);

function normalizeWatermark(value: string): string {
  return /^[0-9]{1,20}:[0-9]{1,20}$/.test(value) ? value : "0:0";
}

function parseWatermark(value: string): { micros: bigint; notificationId: bigint } {
  const normalized = normalizeWatermark(value);
  const [microsRaw, notificationIdRaw] = normalized.split(":");

  try {
    return {
      micros: BigInt(microsRaw ?? "0"),
      notificationId: BigInt(notificationIdRaw ?? "0"),
    };
  } catch {
    return { micros: 0n, notificationId: 0n };
  }
}

function compareWatermarks(left: string, right: string): number {
  const leftValue = parseWatermark(left);
  const rightValue = parseWatermark(right);

  if (leftValue.micros !== rightValue.micros) {
    return leftValue.micros > rightValue.micros ? 1 : -1;
  }
  if (leftValue.notificationId === rightValue.notificationId) return 0;
  return leftValue.notificationId > rightValue.notificationId ? 1 : -1;
}

export function NotificationsUnreadProvider({
  children,
  initialCount,
  initialWatermark,
}: {
  children: React.ReactNode;
  initialCount: number;
  initialWatermark: string;
}) {
  const [clearedThroughWatermark, setClearedThroughWatermark] = useState("0:0");
  const serverWatermark = normalizeWatermark(initialWatermark);
  const unreadCount = useMemo(() => {
    if (serverWatermark === "0:0") return 0;
    if (compareWatermarks(serverWatermark, clearedThroughWatermark) <= 0) return 0;
    return initialCount;
  }, [clearedThroughWatermark, initialCount, serverWatermark]);

  return (
    <NotificationsUnreadContext.Provider
      value={{
        unreadCount,
        markAllRead: (watermark) => {
          const nextWatermark = normalizeWatermark(watermark);
          if (nextWatermark === "0:0") return;
          setClearedThroughWatermark((current) =>
            compareWatermarks(nextWatermark, current) > 0 ? nextWatermark : current
          );
        },
      }}
    >
      {children}
    </NotificationsUnreadContext.Provider>
  );
}

export function useNotificationsUnreadState(): NotificationsUnreadContextValue {
  const context = useContext(NotificationsUnreadContext);
  if (!context) {
    return {
      unreadCount: 0,
      markAllRead: () => {},
    };
  }
  return context;
}
