import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { kv } from "@vercel/kv";
import { normalizeCastHashRaw } from "@/lib/domains/rules/cast-rules/normalize";
import { getUser } from "@/lib/domains/auth/session";
import { markCastRead } from "@/lib/domains/social/cast-read/kv";
import prisma from "@/lib/server/db/cobuild-db-client";
import { COBUILD_CHANNEL_URL } from "@/lib/integrations/farcaster/casts/shared";
import { readClientIpFromHeaders, verifyViewToken } from "@/lib/domains/social/cast-view/token";
import { normalizeAddress } from "@/lib/shared/address";

const BOT_PATTERN =
  /(bot|spider|crawler|slurp|bingpreview|facebookexternalhit|discordbot|telegrambot|whatsapp|gptbot|claudebot)/i;
const VIEW_WINDOW_SECONDS = 30 * 60;
const RATE_LIMIT_WINDOW_SECONDS = 10;
const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_SECONDS * 1000;
const RATE_LIMIT_MAX = 30;

type RateLimitDecision = {
  allowed: boolean;
  resetAt: number;
};

function isProbablyBot(userAgent: string) {
  return BOT_PATTERN.test(userAgent);
}

function hashViewerKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function getUserAddress(): Promise<string | null> {
  try {
    const address = await getUser();
    return address ? normalizeAddress(address) : null;
  } catch {
    return null;
  }
}

async function getViewerKey(
  req: NextRequest,
  userAgent: string,
  address: string | null
): Promise<string> {
  if (address) return hashViewerKey(`addr:${address}`);

  const ip = readClientIpFromHeaders(req.headers);
  if (ip) return hashViewerKey(`ip:${ip}|ua:${userAgent}`);

  return hashViewerKey(`ua:${userAgent}`);
}

function isSameOriginRequest(req: NextRequest): boolean {
  const requestOrigin = req.nextUrl.origin;
  const origin = req.headers.get("origin");
  if (origin && origin !== requestOrigin) return false;

  const referer = req.headers.get("referer");
  if (!origin && referer && !referer.startsWith(requestOrigin)) return false;

  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") return false;

  return true;
}

async function checkRateLimit(rawKey: string, now: number): Promise<RateLimitDecision> {
  const key = `cast:view:rl:${hashViewerKey(rawKey)}`;
  const nowSeconds = Math.floor(now / 1000);
  const windowStart = nowSeconds - (nowSeconds % RATE_LIMIT_WINDOW_SECONDS);
  const resetAt = (windowStart + RATE_LIMIT_WINDOW_SECONDS) * 1000;
  const ttlSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

  try {
    const existing = await kv.get<{ count: number; windowStart: number }>(key);
    if (!existing || existing.windowStart !== windowStart) {
      await kv.set(key, { count: 1, windowStart }, { ex: RATE_LIMIT_WINDOW_SECONDS });
      return { allowed: true, resetAt };
    }

    const next = existing.count + 1;
    if (next > RATE_LIMIT_MAX) {
      return { allowed: false, resetAt };
    }

    await kv.set(key, { count: next, windowStart }, { ex: ttlSeconds });
    return { allowed: true, resetAt };
  } catch {
    return { allowed: false, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }
}

async function isRootCast(hashBuffer: Buffer): Promise<boolean | null> {
  const cast = await prisma.$replica().farcasterCast.findFirst({
    where: {
      hash: hashBuffer as Uint8Array<ArrayBuffer>,
      rootParentUrl: COBUILD_CHANNEL_URL,
      deletedAt: null,
      hiddenAt: null,
      OR: [{ authorProfile: { is: null } }, { authorProfile: { is: { hiddenAt: null } } }],
    },
    select: { parentHash: true },
  });

  if (!cast) return null;
  return cast.parentHash === null;
}

async function markViewIfNew(normalized: string, viewerKey: string): Promise<boolean | null> {
  const key = `cast:view:seen:${normalized}:${viewerKey}`;
  try {
    const result = await kv.set(key, "1", { nx: true, ex: VIEW_WINDOW_SECONDS });
    return Boolean(result);
  } catch {
    return null;
  }
}

async function incrementViewCount(hashBuffer: Buffer): Promise<number> {
  const rows = await prisma.$primary().$queryRaw<{ viewCount: bigint | null }[]>`
    UPDATE farcaster.casts
    SET view_count = view_count + 1
    WHERE hash = ${hashBuffer}
      AND root_parent_url = ${COBUILD_CHANNEL_URL}
      AND parent_hash IS NULL
    RETURNING view_count
  `;

  const viewCount = rows[0]?.viewCount;
  return viewCount ? Number(viewCount) : 0;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const normalized = normalizeCastHashRaw(hash);
  if (!normalized) {
    return NextResponse.json({ ok: false, error: "Invalid cast hash." }, { status: 400 });
  }

  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const ua = req.headers.get("user-agent") ?? "";
  if (isProbablyBot(ua)) {
    return NextResponse.json({ ok: true, counted: false });
  }

  const now = Date.now();
  const viewToken = req.headers.get("x-cobuild-view-token");
  if (!verifyViewToken(viewToken, normalized, req.headers, now)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const hashBuffer = Buffer.from(normalized, "hex");
  const rootCheck = await isRootCast(hashBuffer);
  if (rootCheck === null) {
    return NextResponse.json({ ok: false, error: "Cast not found." }, { status: 404 });
  }
  if (!rootCheck) {
    return NextResponse.json({ ok: true, counted: false });
  }

  const userAddress = await getUserAddress();
  if (userAddress) {
    await markCastRead(userAddress, normalized);
  }

  const rateKey = readClientIpFromHeaders(req.headers) ?? `ua:${ua}`;
  const rateLimit = await checkRateLimit(rateKey, now);
  if (!rateLimit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - now) / 1000));
    return NextResponse.json(
      { ok: false, error: "Rate limited." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const viewerKey = await getViewerKey(req, ua, userAddress);
  const isNewView = await markViewIfNew(normalized, viewerKey);
  if (isNewView === null) {
    return NextResponse.json({ ok: false, error: "View tracking unavailable." }, { status: 503 });
  }
  if (!isNewView) {
    return NextResponse.json({ ok: true, counted: false });
  }

  const viewCount = await incrementViewCount(hashBuffer);
  return NextResponse.json({
    ok: true,
    counted: true,
    viewCount,
  });
}
