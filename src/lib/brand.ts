import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Inline data URI of the ClipSetu brand mark (public/brand/clipsetu-mark.png).
 *
 * `next/og`'s ImageResponse (satori) can only render images from an absolute
 * URL or a data URI, so the PNG is inlined here for the generated favicon,
 * Apple touch icon and PWA icons. Server-only — never import from a client
 * component.
 */
export const MARK_DATA_URI = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public", "brand", "clipsetu-mark.png")
).toString("base64")}`;
