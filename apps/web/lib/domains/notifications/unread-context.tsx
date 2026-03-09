"use client";

import { createContext, useContext, useState } from "react";

type NotificationsUnreadContextValue = {
  unreadCount: number;
  readOverrideActive: boolean;
  markAllRead: () => void;
};

const NotificationsUnreadContext = createContext<NotificationsUnreadContextValue | null>(null);

export function NotificationsUnreadProvider({
  children,
  initialCount,
}: {
  children: React.ReactNode;
  initialCount: number;
}) {
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [readOverrideActive, setReadOverrideActive] = useState(false);

  return (
    <NotificationsUnreadContext.Provider
      value={{
        unreadCount,
        readOverrideActive,
        markAllRead: () => {
          setUnreadCount(0);
          setReadOverrideActive(true);
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
      readOverrideActive: false,
      markAllRead: () => {},
    };
  }
  return context;
}
