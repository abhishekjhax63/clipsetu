import { ImageResponse } from "next/og";

/** Browser tab favicon (32x32), generated from the same brand mark. */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
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
            width: 22,
            height: 22,
            alignItems: "center",
            justifyContent: "center",
            background: "#0b0f17",
            borderRadius: 6,
          }}
        >
          <svg
            width={11}
            height={11}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M8 5.5v13l11-6.5-11-6.5z" fill="#a3e635" />
          </svg>
        </div>
      </div>
    ),
    { ...size }
  );
}
