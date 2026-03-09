"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotificationsUnreadState } from "@/lib/domains/notifications/unread-context";

const READ_WATERMARK_STORAGE_PREFIX = "cobuild:notifications:read:";

type NotificationsReadTrackerProps = {
  watermark: string;
  hasUnreadItems: boolean;
};

export function NotificationsReadTracker({
  watermark,
  hasUnreadItems,
}: NotificationsReadTrackerProps) {
  const router = useRouter();
  const { markAllRead } = useNotificationsUnreadState();

  useEffect(() => {
    if (!hasUnreadItems || !watermark || watermark === "0") return;

    const storageKey = `${READ_WATERMARK_STORAGE_PREFIX}${watermark}`;
    if (window.sessionStorage.getItem(storageKey) === "done") {
      return;
    }

    window.sessionStorage.setItem(storageKey, "pending");

    void fetch("/api/notifications/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ watermark }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to mark notifications read");
        }

        window.sessionStorage.setItem(storageKey, "done");
        markAllRead();
        router.refresh();
      })
      .catch(() => {
        window.sessionStorage.removeItem(storageKey);
      });
  }, [hasUnreadItems, markAllRead, router, watermark]);

  return null;
}
