// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NotificationsUnreadProvider,
  useNotificationsUnreadState,
} from "@/lib/domains/notifications/unread-context";
import { NotificationsReadTracker } from "./notifications-read-tracker";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

function UnreadCountProbe() {
  const { unreadCount } = useNotificationsUnreadState();
  return <span data-testid="unread-count">{unreadCount}</span>;
}

describe("NotificationsReadTracker", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    window.sessionStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
      })
    );
  });

  it("marks the inbox read once per watermark and clears the badge state optimistically", async () => {
    const fetchMock = vi.mocked(fetch);

    const { rerender } = render(
      <NotificationsUnreadProvider initialCount={4}>
        <UnreadCountProbe />
        <NotificationsReadTracker watermark="1741435200000001" hasUnreadItems />
      </NotificationsUnreadProvider>
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(refreshMock).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("unread-count").textContent).toBe("0");
      expect(window.sessionStorage.getItem("cobuild:notifications:read:1741435200000001")).toBe(
        "done"
      );
    });

    rerender(
      <NotificationsUnreadProvider initialCount={4}>
        <UnreadCountProbe />
        <NotificationsReadTracker watermark="1741435200000001" hasUnreadItems />
      </NotificationsUnreadProvider>
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  it("does not post when the page is already fully read", async () => {
    const fetchMock = vi.mocked(fetch);

    render(
      <NotificationsUnreadProvider initialCount={0}>
        <NotificationsReadTracker watermark="1741435200000001" hasUnreadItems={false} />
      </NotificationsUnreadProvider>
    );

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
