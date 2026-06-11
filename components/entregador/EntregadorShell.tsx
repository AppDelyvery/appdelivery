"use client";

import { usePathname } from "next/navigation";
import AppShell, { type ShellNavGroup } from "../AppShell";
import type { IconName } from "../Icons";

// Shell route-based da área do entregador (espelha NegocioShell/AdminShell).
// O fluxo de corrida (cadastro→oferta→coleta→entrega) tem seu próprio shell
// com mapa (EntregadorFlow); as telas estáticas usam este.
export default function EntregadorShell({ title, children }: { title: string; children: React.ReactNode }) {
  const p = usePathname();
  const it = (ic: IconName, label: string, href: string) => ({ ic, label, href, active: href === "/entregador" ? p === href : p.startsWith(href) });

  const nav: ShellNavGroup[] = [
    { group: "Corridas", items: [it("bolt", "Disponíveis", "/entregador")] },
    {
      group: "Financeiro",
      items: [
        it("money", "Ganhos", "/entregador/ganhos"),
        it("card", "Carteira", "/entregador/carteira"),
      ],
    },
    {
      group: "Conta",
      items: [
        it("user", "Meu perfil", "/entregador/perfil"),
        it("star", "Avaliações", "/entregador/avaliacoes"),
        it("send", "Comunicados", "/entregador/comunicados"),
        it("help", "Central de ajuda", "/entregador/ajuda"),
        it("settings", "Configurações", "/entregador/configuracoes"),
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
    <AppShell title={title} nav={nav} demo="entregador" noMap>
      <div className="panel">{children}</div>
    </AppShell>
  );
}
