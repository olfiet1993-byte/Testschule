import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0ea5e9, #10b981)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Outer ring */}
        <div
          style={{
            width: 110,
            height: 110,
            border: "8px solid rgba(255,255,255,0.95)",
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Plus horizontal */}
          <div
            style={{
              width: 60,
              height: 8,
              background: "white",
              borderRadius: 4,
              position: "absolute",
            }}
          />
          {/* Plus vertical */}
          <div
            style={{
              width: 8,
              height: 60,
              background: "white",
              borderRadius: 4,
              position: "absolute",
            }}
          />
        </div>
        {/* Accent dot */}
        <div
          style={{
            position: "absolute",
            right: 30,
            bottom: 30,
            width: 22,
            height: 22,
            background: "#fbbf24",
            borderRadius: 999,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
