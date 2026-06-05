import type { MetadataRoute } from "next";

const SITE = "https://appdelivery-psi.vercel.app";

// Páginas públicas (indexáveis). Admin/área logada ficam de fora.
export default function sitemap(): MetadataRoute.Sitemap {
  const rotas = ["", "/cadastro", "/cadastro/entregador", "/login", "/termos", "/privacidade"];
  return rotas.map((r) => ({
    url: `${SITE}${r}`,
    changeFrequency: "weekly",
    priority: r === "" ? 1 : 0.7,
  }));
}
