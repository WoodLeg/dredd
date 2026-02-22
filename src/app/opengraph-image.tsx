import { ImageResponse } from "next/og";

export const alt = "Dredd — Tribunal de Mega-City One";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#0a0e17",
          color: "#e2e8f0",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 120,
            fontWeight: 900,
            letterSpacing: "0.1em",
            color: "#00f0ff",
            textShadow: "0 0 40px rgba(0,240,255,0.5)",
          }}
        >
          DREDD
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            color: "#94a3b8",
            marginTop: 16,
          }}
        >
          Tribunal de Mega-City One
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "#64748b",
            marginTop: 12,
          }}
        >
          {"Jugement Majoritaire \u2014 la mention m\u00e9diane fait loi"}
        </div>
      </div>
    ),
    { ...size }
  );
}
