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
      <NotificationsUnreadProvider initialCount={4} initialWatermark="1741435200000001:7">
        <UnreadCountProbe />
        <NotificationsReadTracker
          address="0x0000000000000000000000000000000000000001"
          watermark="1741435200000001:7"
          hasUnread
        />
      </NotificationsUnreadProvider>
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(refreshMock).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("unread-count").textContent).toBe("0");
      expect(
        window.sessionStorage.getItem(
          "cobuild:notifications:read:0x0000000000000000000000000000000000000001:1741435200000001:7"
        )
      ).toBe("done");
    });

    rerender(
      <NotificationsUnreadProvider initialCount={4} initialWatermark="1741435200000001:7">
        <UnreadCountProbe />
        <NotificationsReadTracker
          address="0x0000000000000000000000000000000000000001"
          watermark="1741435200000001:7"
          hasUnread
        />
      </NotificationsUnreadProvider>
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  it("clears stale local badge state without posting when the primary page is already read", async () => {
    const fetchMock = vi.mocked(fetch);

    render(
      <NotificationsUnreadProvider initialCount={3} initialWatermark="1741435200000001:7">
        <UnreadCountProbe />
        <NotificationsReadTracker
          address="0x0000000000000000000000000000000000000001"
          watermark="1741435200000001:7"
          hasUnread={false}
        />
      </NotificationsUnreadProvider>
    );

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
      expect(screen.getByTestId("unread-count").textContent).toBe("0");
    });
  });

  it("shows new unread again when the server watermark advances past the optimistic clear", async () => {
    const { rerender } = render(
      <NotificationsUnreadProvider initialCount={4} initialWatermark="1741435200000001:7">
        <UnreadCountProbe />
        <NotificationsReadTracker
          address="0x0000000000000000000000000000000000000001"
          watermark="1741435200000001:7"
          hasUnread
        />
      </NotificationsUnreadProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("unread-count").textContent).toBe("0");
    });

    rerender(
      <NotificationsUnreadProvider initialCount={1} initialWatermark="1741435200000002:1">
        <UnreadCountProbe />
      </NotificationsUnreadProvider>
    );

    expect(screen.getByTestId("unread-count").textContent).toBe("1");
  });

  it("does not clear a newer same-microsecond cursor when only the notification id is older", async () => {
    const fetchMock = vi.mocked(fetch);

    render(
      <NotificationsUnreadProvider initialCount={1} initialWatermark="1741435200000001:8">
        <UnreadCountProbe />
        <NotificationsReadTracker
          address="0x0000000000000000000000000000000000000001"
          watermark="1741435200000001:7"
          hasUnread={false}
        />
      </NotificationsUnreadProvider>
    );

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
      expect(screen.getByTestId("unread-count").textContent).toBe("1");
    });
  });

  it("dedupes read posts per wallet address, not just per watermark", async () => {
    const fetchMock = vi.mocked(fetch);

    const { rerender } = render(
      <NotificationsUnreadProvider initialCount={1} initialWatermark="1741435200000001:7">
        <NotificationsReadTracker
          address="0x0000000000000000000000000000000000000001"
          watermark="1741435200000001:7"
          hasUnread
        />
      </NotificationsUnreadProvider>
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    rerender(
      <NotificationsUnreadProvider initialCount={1} initialWatermark="1741435200000001:7">
        <NotificationsReadTracker
          address="0x0000000000000000000000000000000000000002"
          watermark="1741435200000001:7"
          hasUnread
        />
      </NotificationsUnreadProvider>
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
