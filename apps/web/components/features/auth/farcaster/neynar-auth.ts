"use client";

import {
  isValidSignerUuid,
  normalizeFid,
  normalizeSignerPermissions,
} from "@/lib/integrations/farcaster/signer-utils";
import type { JsonRecord } from "@/lib/shared/json";

const NEYNAR_ORIGIN = "https://app.neynar.com";
const CLIENT_ID = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID;

const POPUP_CONFIG = {
  width: 600,
  height: 700,
  features: ["resizable", "scrollbars", "status"],
} as const;

type NeynarCallbackData = {
  signer_uuid: string;
  fid: number | string;
  signer_permissions: string[];
  is_authenticated: boolean;
};

type NormalizedSignerPayload = {
  fid: number;
  signer_uuid: string;
  signer_permissions: string[];
};

type SignerCallback = (data: NeynarCallbackData) => void;

declare global {
  interface Window {
    __neynarAuthWindow?: Window | null;
  }
}

let activeSignerHandler: SignerCallback | null = null;
let listenerCount = 0;

function validateClientId(clientId: string | undefined): boolean {
  return Boolean(clientId?.match(/^[0-9a-f-]{36}$/i));
}

function validateMessageEvent(event: MessageEvent<NeynarCallbackData>): boolean {
  return (
    event.origin === NEYNAR_ORIGIN &&
    event.isTrusted &&
    event.source === window.__neynarAuthWindow &&
    typeof event.data === "object"
  );
}

function handleGlobalMessage(event: MessageEvent<NeynarCallbackData>) {
  if (!activeSignerHandler || !validateMessageEvent(event)) {
    return;
  }

  if (event.data?.is_authenticated) {
    activeSignerHandler(event.data);
  }
}

function getPopupPosition(width: number, height: number) {
  const left = Math.max(0, (window.screen.width - width) / 2);
  const top = Math.max(0, (window.screen.height - height) / 2);
  return { left, top };
}

function getWindowFeatures(width: number, height: number, left: number, top: number) {
  const isDesktop = window.matchMedia("(min-width: 800px)").matches;
  const secureFeatures = POPUP_CONFIG.features.join(",");
  return isDesktop
    ? `width=${width},height=${height},top=${top},left=${left},${secureFeatures}`
    : "fullscreen=yes";
}

export function isNeynarConfigured(): boolean {
  return validateClientId(CLIENT_ID);
}

export function attachNeynarListener() {
  if (listenerCount === 0) {
    window.addEventListener("message", handleGlobalMessage);
  }
  listenerCount += 1;
}

export function detachNeynarListener() {
  listenerCount = Math.max(0, listenerCount - 1);
  if (listenerCount === 0) {
    window.removeEventListener("message", handleGlobalMessage);
  }
}

export function setActiveNeynarHandler(handler: SignerCallback | null) {
  activeSignerHandler = handler;
}

export function parseNeynarCallbackData(data: JsonRecord | null): NormalizedSignerPayload | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const payload = data as Partial<NeynarCallbackData>;
  if (!isValidSignerUuid(payload.signer_uuid)) return null;
  const fid = normalizeFid(payload.fid);
  if (!fid) return null;
  const signerPermissions = normalizeSignerPermissions(payload.signer_permissions);
  if (!signerPermissions) return null;
  return { fid, signer_uuid: payload.signer_uuid, signer_permissions: signerPermissions };
}

export function openNeynarPopup(): Window | null {
  const { width, height } = POPUP_CONFIG;
  const { left, top } = getPopupPosition(width, height);
  const loginUrl = new URL(`${NEYNAR_ORIGIN}/login`);
  loginUrl.searchParams.append("client_id", CLIENT_ID ?? "");

  const windowFeatures = getWindowFeatures(width, height, left, top);
  const authWindow = window.open(loginUrl.toString(), "_blank", windowFeatures);
  if (authWindow) {
    window.__neynarAuthWindow = authWindow;
  }
  return authWindow;
}

export type { NeynarCallbackData, NormalizedSignerPayload, SignerCallback };
