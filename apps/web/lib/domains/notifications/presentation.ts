import * as wire from "@cobuild/wire/protocol-notifications";

export function buildProtocolNotificationPresentation(args: {
  reason: string;
  payload: Record<string, unknown> | null;
  actorWalletAddress: string | null;
}): {
  title: string;
  excerpt: string | null;
  href: string;
  actorName: string | null;
} {
  const presentation = wire.buildProtocolNotificationPresentation(args);

  return {
    title: presentation.title,
    excerpt: presentation.excerpt,
    href: presentation.appPath,
    actorName: presentation.actorName,
  };
}
