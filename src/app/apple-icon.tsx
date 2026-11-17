import { ImageResponse } from "next/og";

/** Apple touch icon (180x180) used when ClipSetu is added to a home screen. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
            width: 112,
            height: 112,
            alignItems: "center",
            justifyContent: "center",
            background: "#0b0f17",
            borderRadius: 31,
          }}
        >
          <svg
            width={52}
            height={52}
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
