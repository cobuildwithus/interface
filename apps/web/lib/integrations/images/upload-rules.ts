const BYTES_PER_MEGABYTE = 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/heic",
  "image/heif",
  "image/avif",
] as const;

export const IMAGE_ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(",");
export const MAX_IMAGE_SIZE_BYTES = 10 * BYTES_PER_MEGABYTE;
export const MAX_IMAGE_SIZE_LABEL = `${Math.floor(MAX_IMAGE_SIZE_BYTES / BYTES_PER_MEGABYTE)}MB`;

export type ImageValidationErrorCode = "file-too-large" | "file-invalid-type";

const IMAGE_VALIDATION_MESSAGES: Record<ImageValidationErrorCode, string> = {
  "file-too-large": `File too large. Max ${MAX_IMAGE_SIZE_LABEL}.`,
  "file-invalid-type": "Unsupported file type.",
};

type ImageValidationResult =
  | { ok: true }
  | { ok: false; code: ImageValidationErrorCode; message: string };

type ImageFileLike = {
  size: number;
  type: string;
};

export function validateImageFile(file: ImageFileLike): ImageValidationResult {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return {
      ok: false,
      code: "file-invalid-type",
      message: IMAGE_VALIDATION_MESSAGES["file-invalid-type"],
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      code: "file-too-large",
      message: IMAGE_VALIDATION_MESSAGES["file-too-large"],
    };
  }

  return { ok: true };
}

export function getImageRejectionMessage(code?: string): string | null {
  if (code === "file-too-large" || code === "file-invalid-type") {
    return IMAGE_VALIDATION_MESSAGES[code];
  }
  return null;
}
