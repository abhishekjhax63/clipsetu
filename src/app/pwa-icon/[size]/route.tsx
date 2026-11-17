import { ImageResponse } from "next/og";

/**
 * Generates the PNG app icons referenced by src/app/manifest.ts.
 *
 * Rendering the mark here keeps the repository free of binary assets while
 * still providing the real 192px / 512px PNGs that browsers require for
 * installability.
 */

const ALLOWED = new Set(["192", "512"]);

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

function BrandMark({ px }: { px: number }) {
  const inner = Math.round(px * 0.62);
  const radius = Math.round(inner * 0.28);
  const glyph = Math.round(inner * 0.46);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #86efac 0%, #bef264 55%, #a3e635 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          width: inner,
          height: inner,
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0f17",
          borderRadius: radius,
        }}
      >
        <svg
          width={glyph}
          height={glyph}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M8 5.5v13l11-6.5-11-6.5z" fill="#a3e635" />
        </svg>
      </div>
    </div>
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
): Promise<Response> {
  const { size } = await params;
  const px = ALLOWED.has(size) ? Number(size) : 512;

  return new ImageResponse(<BrandMark px={px} />, {
    width: px,
    height: px,
  });
}

