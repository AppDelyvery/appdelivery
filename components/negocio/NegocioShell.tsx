"use client";

import { usePathname } from "next/navigation";
import AppShell, { type ShellNavGroup } from "../AppShell";
import type { IconName } from "../Icons";

// Shell route-based da área do lojista (espelha o AdminShell). O fluxo de
// "Nova entrega" tem seu próprio shell com mapa (NovoPedidoFlow); as telas
// estáticas (histórico, carteira, comunicados, perfil) usam este.
export default function NegocioShell({ title, children }: { title: string; children: React.ReactNode }) {
  const p = usePathname();
  const it = (ic: IconName, label: string, href: string) => ({ ic, label, href, active: p.startsWith(href) });

  const nav: ShellNavGroup[] = [
    {
      group: "Operação",
      items: [
        it("send", "Nova entrega", "/negocio/novo-pedido"),
        it("list", "Histórico", "/negocio/historico"),
        it("chart", "Relatórios", "/negocio/relatorios"),
      ],
    },
    { group: "Avisos", items: [it("send", "Comunicados", "/negocio/comunicados")] },
    { group: "Desenvolvedor", items: [it("bolt", "Integração / API", "/negocio/integracao")] },
    {
      group: "Conta",
      items: [
        it("money", "Carteira", "/negocio/carteira"),
        it("star", "Avaliações", "/negocio/avaliacoes"),
        it("building", "Meu negócio", "/negocio/perfil"),
      ],
    },
  ];

  return (
    <AppShell title={title} nav={nav} demo="negocio" noMap>
      <div className="panel">{children}</div>
    </AppShell>
  );
}
