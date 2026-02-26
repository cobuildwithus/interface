import type { ErrorLike } from "@/lib/shared/errors";
import type { JsonRecord, JsonValue } from "@/lib/shared/json";

const isRecord = (value: JsonValue): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const resolveResponseError = async (response: Response) => {
  try {
    if (typeof response.text !== "function") {
      if (response.statusText) return response.statusText;
      return `Request failed with status ${response.status}`;
    }
    const text = await response.text();
    if (text) {
      try {
        const payload = JSON.parse(text) as JsonValue;
        if (isRecord(payload)) {
          if (typeof payload.error === "string") return payload.error;
          if (typeof payload.message === "string") return payload.message;
        }
      } catch {
        // Fall back to the raw text.
      }
      return text;
    }
  } catch {
    // Ignore response parsing errors.
  }

  if (response.statusText) return response.statusText;
  return `Request failed with status ${response.status}`;
};

export const resolveFetchError = (error: ErrorLike) => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.length > 0) {
      if (error.name === "TypeError" && /fetch/i.test(message)) {
        return "Network error. Check CORS or your connection.";
      }
      return message;
    }
  }
  return "Unexpected error. Please try again.";
};
