import { NextResponse } from "next/server";
import { getSession } from "@/lib/domains/auth/session";
import { validateImageFile } from "@/lib/integrations/images/upload-rules";

type ErrorBody = { error: string };

type UploadResponse = { ok: true; url: string; id?: string } | { ok: false; error: string };

function jsonError(message: string, status: number) {
  return NextResponse.json<ErrorBody>({ error: message }, { status });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.address) {
    return jsonError("Connect a wallet to upload an image.", 401);
  }

  const accountId = process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN;
  const preferredVariant = process.env.CLOUDFLARE_IMAGES_VARIANT;

  if (!accountId || !apiToken) {
    return jsonError("Cloudflare Images is not configured.", 500);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Invalid form data.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("Missing file upload.", 400);
  }

  const validation = validateImageFile(file);
  if (!validation.ok) {
    return jsonError(validation.message, 400);
  }

  const uploadForm = new FormData();
  uploadForm.append("file", file, file.name || "profile");

  let response: Response;
  try {
    response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: uploadForm,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return jsonError(message, 502);
  }

  let payload: {
    success?: boolean;
    errors?: Array<{ message?: string }>;
    result?: { id?: string; variants?: string[] };
  };

  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    return jsonError("Unable to parse upload response.", 502);
  }

  if (!response.ok || !payload?.success) {
    const errorMessage = payload?.errors?.[0]?.message || "Upload failed.";
    return jsonError(errorMessage, response.status || 502);
  }

  const variants = payload.result?.variants ?? [];
  let url = variants[0] ?? null;

  if (preferredVariant) {
    const match = variants.find((variant) => variant.endsWith(`/${preferredVariant}`));
    if (match) {
      url = match;
    }
  }

  if (!url) {
    return jsonError("Upload succeeded, but no delivery URL was returned.", 502);
  }

  const responseBody: UploadResponse = {
    ok: true,
    url,
    id: payload.result?.id,
  };

  return NextResponse.json(responseBody);
}
