import { ImageResponse } from "next/og";

// Ícone do app pra "Adicionar à Tela de Início" (iOS) — estilo 99: marca branca
// no fundo índigo. O iOS arredonda sozinho, então usamos quadrado cheio.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5, #3730a3)",
        }}
      >
        <svg width="104" height="104" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5" cy="17" r="3" />
          <circle cx="19" cy="17" r="3" />
          <path d="M8 17h6l3-5h-3.5l-2-3H7" />
          <path d="M14 7h3" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
