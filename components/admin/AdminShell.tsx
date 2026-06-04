"use client";

import { usePathname } from "next/navigation";
import AppShell, { type ShellNavGroup } from "../AppShell";
import type { IconName } from "../Icons";

export default function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const p = usePathname();
  const it = (ic: IconName, label: string, href: string, badge?: string) => ({
    ic,
    label,
    href,
    badge,
    active: href === "/admin" ? p === "/admin" : p.startsWith(href),
  });

  const nav: ShellNavGroup[] = [
    {
      group: "Operação",
      items: [
        it("chart", "Dashboard", "/admin"),
        it("pin", "Despacho", "/admin/despacho"),
        it("pkg", "Corridas", "/admin/corridas"),
        it("send", "Mensagens", "/admin/mensagens"),
        it("moto", "Entregadores", "/admin/entregadores"),
        it("building", "Negócios", "/admin/negocios"),
      ],
    },
    { group: "Inteligência", items: [it("bolt", "Rankings", "/admin/rankings")] },
    { group: "Suporte", items: [it("shield", "Chamados", "/admin/suporte")] },
    { group: "Financeiro", items: [it("money", "Financeiro", "/admin/financeiro")] },
    { group: "Configurações", items: [it("user", "Configurações", "/admin/config")] },
  ];

  return (
    <AppShell title={title} nav={nav} demo="admin" noMap>
      <div className="panel">{children}</div>
    </AppShell>
  );
}
