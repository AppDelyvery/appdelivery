import type { MetadataRoute } from "next";

// PWA: deixa o app "instalável" na tela inicial, rodando em tela cheia (sem
// barra do navegador), com a marca e a cor índigo — estilo app nativo.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "APPDELYVERY",
    short_name: "APPDELYVERY",
    description: "Entrega de encomendas com entregador verificado — Palmas-TO",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    background_color: "#4f46e5",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
