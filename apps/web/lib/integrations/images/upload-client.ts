import type { JsonRecord, JsonValue } from "@/lib/shared/json";
import {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_ACCEPT_ATTRIBUTE,
  MAX_IMAGE_SIZE_BYTES,
  getImageRejectionMessage,
  validateImageFile,
} from "@/lib/integrations/images/upload-rules";

export {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_ACCEPT_ATTRIBUTE,
  MAX_IMAGE_SIZE_BYTES,
  getImageRejectionMessage,
  validateImageFile,
};

type UploadResponse = { url?: string; error?: string } | null;

export class UploadImageError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "UploadImageError";
    this.status = status;
  }
}

export function isUploadImageAuthError(error: unknown): error is UploadImageError {
  return error instanceof UploadImageError && error.status === 401;
}

type UploadImageOptions = {
  onProgress?: (progress: number) => void;
};

const parseUploadPayload = (payload: JsonValue): UploadResponse => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const { url, error } = payload as JsonRecord;
  return {
    url: typeof url === "string" ? url : undefined,
    error: typeof error === "string" ? error : undefined,
  };
};

const resolveUploadUrl = (payload: UploadResponse, status: number, ok: boolean): string => {
  if (ok && payload?.url) {
    return payload.url;
  }
  throw new UploadImageError(payload?.error ?? "Failed to upload image.", status);
};

const isOkStatus = (status: number) => status >= 200 && status < 300;

const safeJsonParse = (value: string): JsonValue | null => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const parseResponsePayload = async (response: Response) =>
  parseUploadPayload(await response.json().catch(() => null));

const parseRequestPayload = (request: XMLHttpRequest) =>
  parseUploadPayload(
    request.response && typeof request.response === "object"
      ? request.response
      : safeJsonParse(request.responseText || "null")
  );

const uploadWithFetch = async (formData: FormData) => {
  const res = await fetch("/api/images/upload", {
    method: "POST",
    body: formData,
  });

  const payload = await parseResponsePayload(res);
  return resolveUploadUrl(payload, res.status, res.ok);
};

const uploadWithXhr = (formData: FormData, file: File, onProgress: (progress: number) => void) =>
  new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("POST", "/api/images/upload");
    request.responseType = "json";

    request.upload.onprogress = (event) => {
      const total = event.total || file.size || 0;
      if (!total) return;
      const nextProgress = Math.min(Math.max(event.loaded / total, 0), 1);
      onProgress(nextProgress);
    };

    request.addEventListener("load", () => {
      const status = request.status;
      const payload = parseRequestPayload(request);

      try {
        resolve(resolveUploadUrl(payload, status, isOkStatus(status)));
      } catch (error) {
        reject(error);
      }
    });

    request.addEventListener("error", () => {
      reject(new UploadImageError("Failed to upload image.", request.status));
    });

    request.send(formData);
  });

export async function uploadImage(
  file: File,
  { onProgress }: UploadImageOptions = {}
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  if (!onProgress) {
    return uploadWithFetch(formData);
  }

  return uploadWithXhr(formData, file, onProgress);
}
