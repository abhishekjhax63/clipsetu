import { ImageResponse } from "next/og";
import { MARK_DATA_URI } from "@/lib/brand";

/** Apple touch icon (180x180) used when ClipSetu is added to a home screen. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <img src={MARK_DATA_URI} width={180} height={180} alt="" />
      </div>
    ),
    { ...size }
  );
}
