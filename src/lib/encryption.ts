/**
 * Server-only symmetric encryption for stored third-party secrets (e.g. social
 * platform OAuth tokens). Uses AES-256-GCM with a key derived from APP_SECRET.
 *
 * IMPORTANT: never import this from client code. Never log decrypted values.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const PLACEHOLDER = "change-me-to-a-long-random-string";

function getKey(): Buffer | null {
  const secret = process.env.APP_SECRET;
  if (!secret || secret === PLACEHOLDER || secret.length < 16) return null;
  return createHash("sha256").update(secret).digest();
}

export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}

/**
 * Encrypts a UTF-8 string. Returns a compact `iv.tag.ciphertext` (base64) token,
 * or null when APP_SECRET is not configured (caller must handle this and show a
 * setup requirement instead of storing a plaintext secret).
 */
export function encryptSecret(plaintext: string): string | null {
  const key = getKey();
  if (!key) return null;

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decryptSecret(payload: string | null | undefined): string | null {
  const key = getKey();
  if (!key || !payload) return null;

  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) return null;

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivB64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    // Tampered or wrong key — treat as unavailable.
    return null;
  }
}
