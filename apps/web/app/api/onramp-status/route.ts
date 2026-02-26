import "server-only";

import { NextResponse } from "next/server";
import { generateJwt } from "@coinbase/cdp-sdk/auth";
import { getSession } from "@/lib/domains/auth/session";

type OnrampTransaction = {
  status:
    | "ONRAMP_TRANSACTION_STATUS_IN_PROGRESS"
    | "ONRAMP_TRANSACTION_STATUS_SUCCESS"
    | "ONRAMP_TRANSACTION_STATUS_FAILED";
  transaction_id: string;
  wallet_address?: string;
  tx_hash?: string;
  purchase_currency?: string;
  purchase_network?: string;
  purchase_amount?: string;
  payment_total?: string;
  payment_method?: string;
  partner_user_ref?: string;
};

type StatusApiResponse = {
  transactions?: Array<OnrampTransaction>;
  next_page_key?: string;
  total_count?: number;
};

type OnrampStatusResponse = {
  tx: OnrampTransaction | null;
  error?: string;
};

export async function GET() {
  const session = await getSession();
  if (!session.address) {
    return NextResponse.json<OnrampStatusResponse>(
      { tx: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const apiKeyId = process.env.CDP_API_KEY_ID;
  const apiKeySecret = process.env.CDP_API_KEY_SECRET;
  if (!apiKeyId || !apiKeySecret) {
    return NextResponse.json<OnrampStatusResponse>(
      { tx: null, error: "CDP keys not configured" },
      { status: 500 }
    );
  }

  const partnerUserId = session.address;
  const path = `/onramp/v1/buy/user/${encodeURIComponent(partnerUserId)}/transactions?page_size=1`;

  const jwt = await generateJwt({
    apiKeyId,
    apiKeySecret,
    requestMethod: "GET",
    requestHost: "api.developer.coinbase.com",
    requestPath: path,
    expiresIn: 120,
  });

  const resp = await fetch(`https://api.developer.coinbase.com${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json<OnrampStatusResponse>(
      { tx: null, error: `status failed: ${text}` },
      { status: 502 }
    );
  }

  const data = (await resp.json()) as StatusApiResponse;
  const tx = data.transactions?.[0] ?? null;

  return NextResponse.json<OnrampStatusResponse>({ tx });
}
