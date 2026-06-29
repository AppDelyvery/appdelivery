import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A página principal (/) serve a vitrine premium estática (public/site).
  // As rotas do app (/login, /cadastro, /negocio, /entregador, /admin) seguem normais.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/site/index.html" },
        { source: "/seja-entregador", destination: "/site/entregador.html" },
      ],
    };
  },
};

export default nextConfig;
