"use client";

import { createContext, useContext, useMemo, useState } from "react";

type NotificationsUnreadContextValue = {
  unreadCount: number;
  markAllRead: (watermark: string) => void;
};

const NotificationsUnreadContext = createContext<NotificationsUnreadContextValue | null>(null);

function normalizeWatermark(value: string): string {
  return /^[0-9]{1,20}$/.test(value) ? value : "0";
}

function compareWatermarks(left: string, right: string): number {
  const normalizedLeft = normalizeWatermark(left);
  const normalizedRight = normalizeWatermark(right);

  try {
    const leftValue = BigInt(normalizedLeft);
    const rightValue = BigInt(normalizedRight);
    if (leftValue === rightValue) return 0;
    return leftValue > rightValue ? 1 : -1;
  } catch {
    return normalizedLeft.localeCompare(normalizedRight);
  }
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
  const [clearedThroughWatermark, setClearedThroughWatermark] = useState("0");
  const serverWatermark = normalizeWatermark(initialWatermark);
  const unreadCount = useMemo(() => {
    if (serverWatermark === "0") return 0;
    if (compareWatermarks(serverWatermark, clearedThroughWatermark) <= 0) return 0;
    return initialCount;
  }, [clearedThroughWatermark, initialCount, serverWatermark]);

  return (
    <NotificationsUnreadContext.Provider
      value={{
        unreadCount,
        markAllRead: (watermark) => {
          const nextWatermark = normalizeWatermark(watermark);
          if (nextWatermark === "0") return;
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
