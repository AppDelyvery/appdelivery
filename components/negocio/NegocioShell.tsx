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
        it("pkg", "Nova entrega", "/negocio/novo-pedido"),
        it("list", "Histórico", "/negocio/historico"),
        it("chart", "Relatórios", "/negocio/relatorios"),
      ],
    },
    { group: "Financeiro", items: [it("money", "Carteira", "/negocio/carteira")] },
    {
      group: "Gestão",
      items: [
        it("star", "Avaliações", "/negocio/avaliacoes"),
        it("bolt", "Integração / API", "/negocio/integracao"),
      ],
    },
    {
      group: "Conta",
      items: [
        it("building", "Meu negócio", "/negocio/perfil"),
        it("send", "Comunicados", "/negocio/comunicados"),
        it("help", "Central de ajuda", "/negocio/ajuda"),
        it("settings", "Configurações", "/negocio/configuracoes"),
      ],
    },
    {
      group: "Sobre",
      items: [
        it("report", "Termos de uso", "/termos"),
        it("shield", "Privacidade", "/privacidade"),
      ],
    },
  ];

  return (
    <AppShell title={title} nav={nav} demo="negocio" noMap>
      <div className="panel">{children}</div>
    </AppShell>
  );
}
