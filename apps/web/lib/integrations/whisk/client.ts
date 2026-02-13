import "server-only";
import type { JsonRecord } from "@/lib/shared/json";

const WHISK_API_ENDPOINT = "https://api-v2.whisk.so/graphql";

let whiskWarningLogged = false;

export async function queryWhiskGraphQL<T, TVars extends JsonRecord = JsonRecord>(
  query: string,
  variables?: TVars
): Promise<T | null> {
  const apiKey = process.env.WHISK_API_KEY;
  if (!apiKey) {
    if (!whiskWarningLogged) {
      console.warn("[Whisk] WHISK_API_KEY not configured – profile fallback disabled");
      whiskWarningLogged = true;
    }
    return null;
  }

  const response = await fetch(WHISK_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Whisk request failed: ${response.status}`);
  }

  const result = await response.json();
  if (result.errors?.length) {
    throw new Error(
      `Whisk errors: ${result.errors.map((e: { message: string }) => e.message).join(", ")}`
    );
  }

  return result.data;
}
