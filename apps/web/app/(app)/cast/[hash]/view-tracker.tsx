"use client";

import { useEffect } from "react";

type CastViewTrackerProps = {
  hash: string;
  token?: string | null;
  tokenRequired?: boolean;
};

export function CastViewTracker({ hash, token, tokenRequired }: CastViewTrackerProps) {
  useEffect(() => {
    if (!hash) return;
    if (tokenRequired && !token) return;

    const headers: HeadersInit = token ? { "x-cobuild-view-token": token } : {};

    fetch(`/api/cast/${hash}/view`, {
      method: "POST",
      cache: "no-store",
      keepalive: true,
      headers,
    }).catch(() => {
      // Ignore view tracking errors to avoid impacting UX.
    });
  }, [hash, token, tokenRequired]);

  return null;
}
