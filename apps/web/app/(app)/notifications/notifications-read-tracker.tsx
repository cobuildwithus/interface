"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type NotificationsReadTrackerProps = {
  watermark: string;
  shouldRefresh: boolean;
};

export function NotificationsReadTracker({
  watermark,
  shouldRefresh,
}: NotificationsReadTrackerProps) {
  const router = useRouter();
  const hasPostedRef = useRef(false);

  useEffect(() => {
    if (hasPostedRef.current || !watermark) return;
    hasPostedRef.current = true;

    void fetch("/api/notifications/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ watermark }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to mark notifications read");
        }
        if (shouldRefresh) {
          router.refresh();
        }
      })
      .catch(() => {
        hasPostedRef.current = false;
      });
  }, [router, shouldRefresh, watermark]);

  return null;
}
