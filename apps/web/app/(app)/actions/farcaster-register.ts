"use server";

import type {
  RegisterCompleteResponse,
  RegisterInitResponse,
} from "@/lib/integrations/farcaster/register-types";
import { getSession } from "@/lib/domains/auth/session";
import {
  completeFarcasterRegistration,
  initFarcasterRegistration,
} from "@/lib/server/farcaster-register";
import type { JsonRecord } from "@/lib/shared/json";

export async function registerFarcasterInitAction(body: {
  custodyAddress?: string;
}): Promise<{ ok: true; data: RegisterInitResponse } | { ok: false; error: string }> {
  const session = await getSession();
  const result = await initFarcasterRegistration(session, body);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, data: result.data };
}

export async function registerFarcasterCompleteAction(body: {
  fid?: number;
  signature?: string;
  custodyAddress?: string;
  deadline?: number;
  fname?: string;
  metadata?: JsonRecord;
}): Promise<{ ok: true; data: RegisterCompleteResponse } | { ok: false; error: string }> {
  const session = await getSession();
  const result = await completeFarcasterRegistration(session, body);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, data: result.data };
}
