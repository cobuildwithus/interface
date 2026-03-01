const BYTES_PER_MEGABYTE = 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;
const GIF87A_SIGNATURE = "GIF87a";
const GIF89A_SIGNATURE = "GIF89a";
const RIFF_SIGNATURE = "RIFF";
const WEBP_SIGNATURE = "WEBP";
const ISO_FTYP_MARKER = "ftyp";
const AVIF_BRANDS = new Set(["avif", "avis"]);
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx"]);
const HEIF_BRANDS = new Set(["mif1", "msf1", "heif", "heim", "heis", "hevm", "hevs"]);

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/gif",
  "image/webp",
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

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  for (let index = 0; index < signature.length; index += 1) {
    if (bytes[index] !== signature[index]) return false;
  }
  return true;
}

function hasAscii(bytes: Uint8Array, offset: number, value: string): boolean {
  if (bytes.length < offset + value.length) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (bytes[offset + index] !== value.charCodeAt(index)) return false;
  }
  return true;
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string | null {
  if (bytes.length < offset + length) return null;
  let output = "";
  for (let index = 0; index < length; index += 1) {
    output += String.fromCharCode(bytes[offset + index]);
  }
  return output;
}

function readIsoBmffMajorBrand(bytes: Uint8Array): string | null {
  if (!hasAscii(bytes, 4, ISO_FTYP_MARKER)) return null;
  return readAscii(bytes, 8, 4);
}

export function isSupportedImageBytes(type: string, bytes: Uint8Array): boolean {
  const normalizedType = type.toLowerCase();

  switch (normalizedType) {
    case "image/png":
      return startsWith(bytes, PNG_SIGNATURE);
    case "image/jpeg":
    case "image/jpg":
    case "image/pjpeg":
      return startsWith(bytes, JPEG_SIGNATURE);
    case "image/gif":
      return hasAscii(bytes, 0, GIF87A_SIGNATURE) || hasAscii(bytes, 0, GIF89A_SIGNATURE);
    case "image/webp":
      return hasAscii(bytes, 0, RIFF_SIGNATURE) && hasAscii(bytes, 8, WEBP_SIGNATURE);
    case "image/avif": {
      const brand = readIsoBmffMajorBrand(bytes);
      return brand ? AVIF_BRANDS.has(brand) : false;
    }
    case "image/heic": {
      const brand = readIsoBmffMajorBrand(bytes);
      return brand ? HEIC_BRANDS.has(brand) : false;
    }
    case "image/heif": {
      const brand = readIsoBmffMajorBrand(bytes);
      return brand ? HEIF_BRANDS.has(brand) || HEIC_BRANDS.has(brand) : false;
    }
    default:
      return false;
  }
}

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
