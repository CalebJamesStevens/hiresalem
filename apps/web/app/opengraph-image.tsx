import { ImageResponse } from "next/og"

export const size = {
  width: 1200,
  height: 630
}

export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background: "linear-gradient(135deg, #0f172a 0%, #334155 45%, #f8fafc 100%)",
          color: "#0f172a",
          padding: "56px",
          fontFamily: "Arial, sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            background: "rgba(255,255,255,0.92)",
            borderRadius: "32px",
            padding: "44px"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ fontSize: "26px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#475569" }}>HireSalem</div>
            <div style={{ fontSize: "64px", fontWeight: 700, lineHeight: 1.05 }}>Salem-area jobs with local intent</div>
            <div style={{ fontSize: "28px", color: "#334155", lineHeight: 1.35 }}>
              Salem jobs, Keizer jobs, category landing pages, and local guides for serious job seekers.
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "24px", color: "#475569" }}>
            <div>hiresalem.com</div>
            <div>Salem, Oregon</div>
          </div>
        </div>
      </div>
    ),
    size
  )
}
