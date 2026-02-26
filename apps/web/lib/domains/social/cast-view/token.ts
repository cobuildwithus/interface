import "server-only";

import { createHash, createHmac, timingSafeEqual } from "crypto";
import { isRecord } from "@/lib/server/validation";
import type { JsonValue } from "@/lib/shared/json";

type HeaderGetter = Pick<Headers, "get">;

const VIEW_TOKEN_TTL_MS = 5 * 60 * 1000;
const VIEW_TOKEN_CLOCK_SKEW_MS = 30 * 1000;
const VIEW_TOKEN_SECRET = process.env.CAST_VIEW_TOKEN_SECRET ?? "";
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/;

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): Buffer | null {
  if (!value || !BASE64URL_PATTERN.test(value)) return null;
  try {
    return Buffer.from(value, "base64url");
  } catch {
    return null;
  }
}

function hashViewerFingerprint(headers: HeaderGetter): string {
  const userAgent = headers.get("user-agent") ?? "";
  const ip = readClientIpFromHeaders(headers);
  const source = ip ? `ip:${ip}|ua:${userAgent}` : `ua:${userAgent}`;
  return createHash("sha256").update(source).digest("hex");
}

function signToken(payload: string, fingerprint: string): Buffer {
  return createHmac("sha256", VIEW_TOKEN_SECRET).update(`${payload}.${fingerprint}`).digest();
}

export function isViewTokenEnabled(): boolean {
  return VIEW_TOKEN_SECRET.length > 0;
}

export function readClientIpFromHeaders(headers: HeaderGetter): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cfIp = headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  return null;
}

export function createViewToken(
  hash: string,
  headers: HeaderGetter,
  now = Date.now()
): string | null {
  if (!isViewTokenEnabled()) return null;

  const payload = base64UrlEncode(JSON.stringify({ h: hash, t: now }));
  const signature = signToken(payload, hashViewerFingerprint(headers)).toString("base64url");
  return `${payload}.${signature}`;
}

export function verifyViewToken(
  token: string | null | undefined,
  hash: string,
  headers: HeaderGetter,
  now = Date.now()
): boolean {
  if (!isViewTokenEnabled()) return true;
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const decoded = base64UrlDecode(payload);
  if (!decoded) return false;

  let parsed: JsonValue = null;
  try {
    parsed = JSON.parse(decoded.toString("utf8")) as JsonValue;
  } catch {
    return false;
  }

  if (!isRecord(parsed)) return false;
  const tokenHash = typeof parsed.h === "string" ? parsed.h : null;
  const tokenTimestamp = typeof parsed.t === "number" ? parsed.t : null;
  if (!tokenHash || tokenHash !== hash || tokenTimestamp === null) return false;

  if (tokenTimestamp > now + VIEW_TOKEN_CLOCK_SKEW_MS) return false;
  if (now - tokenTimestamp > VIEW_TOKEN_TTL_MS) return false;

  const expected = signToken(payload, hashViewerFingerprint(headers));
  const actual = base64UrlDecode(signature);
  if (!actual || actual.length !== expected.length) return false;

  return timingSafeEqual(expected, actual);
}
