import { ImageResponse } from "next/og";
import { MARK_DATA_URI } from "@/lib/brand";

/** Browser tab favicon (32x32), generated from the ClipSetu brand mark. */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <img src={MARK_DATA_URI} width={32} height={32} alt="" />
      </div>
    ),
    { ...size }
  );
}
