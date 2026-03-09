"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotificationsUnreadState } from "@/lib/domains/notifications/unread-context";

const READ_WATERMARK_STORAGE_PREFIX = "cobuild:notifications:read:";

type NotificationsReadTrackerProps = {
  address: string;
  watermark: string;
  hasUnread: boolean;
};

export function NotificationsReadTracker({
  address,
  watermark,
  hasUnread,
}: NotificationsReadTrackerProps) {
  const router = useRouter();
  const { markAllRead } = useNotificationsUnreadState();

  useEffect(() => {
    if (!watermark || watermark === "0") return;

    if (!hasUnread) {
      markAllRead(watermark);
      return;
    }

    const storageKey = `${READ_WATERMARK_STORAGE_PREFIX}${address.toLowerCase()}:${watermark}`;
    if (window.sessionStorage.getItem(storageKey) === "done") {
      markAllRead(watermark);
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
        markAllRead(watermark);
        router.refresh();
      })
      .catch(() => {
        window.sessionStorage.removeItem(storageKey);
      });
  }, [address, hasUnread, markAllRead, router, watermark]);

  return null;
}
