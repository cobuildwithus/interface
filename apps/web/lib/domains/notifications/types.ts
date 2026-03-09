export type NotificationKind = "discussion" | "payment" | "protocol";

export type NotificationReason = "mention" | "reply_to_root" | "reply_to_reply" | string;

export type NotificationActor = {
  fid: number | null;
  name: string;
  username: string | null;
  avatarUrl: string | null;
};

export type NotificationListItem = {
  id: string;
  kind: NotificationKind;
  reason: NotificationReason;
  actor: NotificationActor | null;
  eventAt: string;
  createdAt: string;
  isUnread: boolean;
  href: string | null;
  sourceHash: string | null;
  rootHash: string | null;
  targetHash: string | null;
  rootTitle: string | null;
  sourceExcerpt: string | null;
  payload: Record<string, unknown> | null;
};

export type NotificationsPageData = {
  items: NotificationListItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  unreadCount: number;
  watermark: string;
};

export type NotificationsUnreadState = {
  count: number;
  watermark: string;
};
