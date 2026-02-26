import "server-only";

export type Session = Awaited<ReturnType<typeof import("@/lib/domains/auth/session").getSession>>;
