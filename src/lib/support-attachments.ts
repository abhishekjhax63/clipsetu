import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Support-ticket attachment helpers (Phase 9).
 *
 * Uploaded files go into the PRIVATE `support-attachments` Supabase Storage
 * bucket and are referenced from `ticket_messages.attachment_url` by their
 * object path (`<user_id>/<uuid>.<ext>`). Legacy/external https:// links are
 * still accepted and stored verbatim, so the column holds either a storage path
 * or an absolute https URL.
 *
 * Validation runs server-side BEFORE any upload: an explicit MIME allowlist, a
 * 5 MiB cap AND a magic-number signature check (a browser-supplied
 * `file.type` is not trustworthy on its own). The bucket repeats the MIME and
 * size limits as a second line of defence — see
 * supabase/migrations/0006_storage.sql.
 */

export const ATTACHMENT_BUCKET = "support-attachments";
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MiB

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

/** `accept` attribute for the file input. */
export const ATTACHMENT_ACCEPT = Object.keys(EXTENSION_BY_MIME).join(",");

/** Human-readable constraints, shared by the new-ticket and reply forms. */
export const ATTACHMENT_HINT = "PNG, JPG, WebP, GIF or PDF · up to 5 MB.";

const EXTERNAL_LINK = /^https:\/\//i;

/** True when a candidate is a valid, secure external link (https only). */
export function parseExternalLink(
  value: string
): { ok: true; url: string | null } | { ok: false } {
  if (!value) return { ok: true, url: null };
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return { ok: false };
    return { ok: true, url: parsed.toString() };
  } catch {
    return { ok: false };
  }
}

/**
 * The leading bytes a file of the given MIME type must start with. A browser
 * `file.type` can be forged, so we verify the actual content signature.
 */
async function hasValidSignature(file: File, mime: string): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const starts = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);

  switch (mime) {
    case "image/png":
      return starts(0x89, 0x50, 0x4e, 0x47);
    case "image/jpeg":
      return starts(0xff, 0xd8, 0xff);
    case "image/gif":
      return starts(0x47, 0x49, 0x46, 0x38); // "GIF8"
    case "image/webp":
      return (
        starts(0x52, 0x49, 0x46, 0x46) && // "RIFF"
        head[8] === 0x57 &&
        head[9] === 0x45 &&
        head[10] === 0x42 &&
        head[11] === 0x50 // "WEBP"
      );
    case "application/pdf":
      return starts(0x25, 0x50, 0x44, 0x46); // "%PDF"
    default:
      return false;
  }
}

/**
 * Validate an optional uploaded file. A missing or empty file input yields
 * `{ ok: true, file: null }` — an attachment is always optional.
 */
export async function validateAttachment(
  input: FormDataEntryValue | null
): Promise<{ ok: true; file: File | null } | { ok: false; error: string }> {
  if (!(input instanceof File) || input.size === 0) {
    return { ok: true, file: null };
  }
  if (input.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: "Attachments must be 5 MB or smaller." };
  }
  const extension = EXTENSION_BY_MIME[input.type];
  if (!extension) {
    return { ok: false, error: "Upload a PNG, JPG, WebP, GIF or PDF file." };
  }
  if (!(await hasValidSignature(input, input.type))) {
    return {
      ok: false,
      error: "That file's contents don't match its type. Please re-export it and try again.",
    };
  }
  return { ok: true, file: input };
}

/**
 * Upload a validated file into the caller's own storage prefix. Returns the
 * object path to persist in `ticket_messages.attachment_url`.
 */
export async function uploadAttachment(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const extension = EXTENSION_BY_MIME[file.type] ?? "bin";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return {
      ok: false,
      error: "We couldn't upload your attachment. Please try again.",
    };
  }
  return { ok: true, path };
}

/**
 * Turn a stored attachment reference into a browsable URL. External https links
 * are returned as-is; storage paths are exchanged for a 1-hour signed URL.
 * Returns null when the object is missing or not readable by the caller.
 */
export async function resolveAttachmentUrl(
  supabase: SupabaseClient,
  reference: string | null
): Promise<string | null> {
  if (!reference) return null;
  if (EXTERNAL_LINK.test(reference)) return reference;

  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(reference, 60 * 60);

  if (error || !data) return null;
  return data.signedUrl;
}
