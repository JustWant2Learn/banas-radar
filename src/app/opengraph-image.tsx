import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Banas Radar — Alam mo kung saan mainit.";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 45%, #bbf7d0 100%)",
          color: "#14532d",
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            background: "#16a34a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: 48,
            fontWeight: 800,
            marginBottom: 28,
          }}
        >
          BR
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2 }}>Banas Radar</div>
        <div style={{ fontSize: 36, marginTop: 12, color: "#166534" }}>Alam mo kung saan mainit.</div>
        <div style={{ fontSize: 24, marginTop: 28, color: "#3f6212", maxWidth: 800 }}>
          Heat index map for the Philippines — stay safe when it gets delikado.
        </div>
      </div>
    ),
    size,
  );
}
