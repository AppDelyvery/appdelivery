"use client";

import { usePathname } from "next/navigation";
import AppShell, { type ShellNavGroup } from "../AppShell";
import type { IconName } from "../Icons";

// Shell route-based da área do entregador (espelha NegocioShell/AdminShell).
// O fluxo de corrida (cadastro→oferta→coleta→entrega) tem seu próprio shell
// com mapa (EntregadorFlow); as telas estáticas usam este.
export default function EntregadorShell({ title, children }: { title: string; children: React.ReactNode }) {
  const p = usePathname();
  const it = (ic: IconName, label: string, href: string) => ({ ic, label, href, active: p.startsWith(href) });

  const nav: ShellNavGroup[] = [
    {
      group: "Corridas",
      items: [
        it("bolt", "Disponíveis", "/entregador"),
        it("money", "Ganhos", "/entregador/ganhos"),
      ],
    },
    { group: "Avisos", items: [it("send", "Comunicados", "/entregador/comunicados")] },
    { group: "Conta", items: [it("shield", "Verificação", "/entregador/perfil")] },
  ];

  return (
    <AppShell title={title} nav={nav} demo="entregador" noMap>
      <div className="panel">{children}</div>
    </AppShell>
  );
}
