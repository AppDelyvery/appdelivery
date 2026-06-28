// Mapa canônico papel -> home. Fonte única usada nos layouts (gate por papel) e no login.
export function rotaPorPapel(role?: string | null): string {
  if (role === "entregador") return "/entregador";
  if (role === "admin" || role === "operador") return "/admin";
  return "/negocio/novo-pedido"; // estabelecimento (lojista) e default
}
