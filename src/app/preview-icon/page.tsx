import { DreddHelmetIcon } from "@/components/ui/dredd-helmet-icon";
import { JudgeDredd } from "../icons/dredd/judge";

export default function PreviewIcon() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 40,
        padding: 60,
        background: "#0C0C0E",
        minHeight: "100vh",
        alignItems: "center",
      }}
    >
      <h1 style={{ color: "#E8E8EC", fontSize: 24, fontFamily: "system-ui" }}>
        Dredd Helmet Icon Preview
      </h1>

      <JudgeDredd/>

      <div style={{ display: "flex", gap: 40, alignItems: "end" }}>
        <div style={{ textAlign: "center" }}>
          <DreddHelmetIcon size={24} style={{ color: "#E8E8EC" }} />
          <p style={{ color: "#8A8A96", marginTop: 8, fontSize: 12 }}>24px</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <DreddHelmetIcon size={32} style={{ color: "#E8E8EC" }} />
          <p style={{ color: "#8A8A96", marginTop: 8, fontSize: 12 }}>32px</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <DreddHelmetIcon size={48} style={{ color: "#E8E8EC" }} />
          <p style={{ color: "#8A8A96", marginTop: 8, fontSize: 12 }}>48px</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <DreddHelmetIcon size={64} style={{ color: "#E8E8EC" }} />
          <p style={{ color: "#8A8A96", marginTop: 8, fontSize: 12 }}>64px</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <DreddHelmetIcon size={128} style={{ color: "#E8E8EC" }} />
          <p style={{ color: "#8A8A96", marginTop: 8, fontSize: 12 }}>128px</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <DreddHelmetIcon size={256} style={{ color: "#E8E8EC" }} />
          <p style={{ color: "#8A8A96", marginTop: 8, fontSize: 12 }}>256px</p>
        </div>
      </div>

      {/* Color palette swatches */}
      <h2
        style={{
          color: "#E8E8EC",
          fontSize: 20,
          fontFamily: "system-ui",
          marginTop: 40,
        }}
      >
        Dredd Color Palette
      </h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { name: "Dredd Black", hex: "#0C0C0E" },
          { name: "Mega-City Gray", hex: "#1A1A1F" },
          { name: "Steel Gray", hex: "#2A2A32" },
          { name: "Gunmetal", hex: "#3D3D47" },
          { name: "Dredd Red", hex: "#C41E1E" },
          { name: "Badge Gold", hex: "#C4941E" },
          { name: "Judge Green", hex: "#3D5A3D" },
          { name: "Ashen", hex: "#8A8A96" },
          { name: "Bone White", hex: "#E8E8EC" },
          { name: "Verdict Green", hex: "#1B7D3A" },
          { name: "Condemn Red", hex: "#D32F2F" },
        ].map((c) => (
          <div key={c.hex} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 80,
                height: 80,
                background: c.hex,
                borderRadius: 12,
                border: "1px solid #3D3D47",
              }}
            />
            <p
              style={{
                color: "#E8E8EC",
                fontSize: 11,
                marginTop: 6,
                fontFamily: "system-ui",
              }}
            >
              {c.name}
            </p>
            <p style={{ color: "#8A8A96", fontSize: 10, fontFamily: "monospace" }}>
              {c.hex}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
