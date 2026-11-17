import { ImageResponse } from "next/og";
import { MARK_DATA_URI } from "@/lib/brand";

/**
 * Generates the PNG app icons referenced by src/app/manifest.ts.
 *
 * The ClipSetu brand mark is drawn edge-to-edge on a white field so the icons
 * stay legible both as "any" and when centre-cropped as "maskable".
 */

const ALLOWED = new Set(["192", "512"]);

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
): Promise<Response> {
  const { size } = await params;
  const px = ALLOWED.has(size) ? Number(size) : 512;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MARK_DATA_URI} width={px} height={px} alt="" />
      </div>
    ),
    { width: px, height: px }
  );
}
