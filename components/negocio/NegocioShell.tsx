"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AppShell, { type ShellNavGroup } from "../AppShell";
import type { IconName } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";

// Shell route-based da área do lojista (espelha o AdminShell). O fluxo de
// "Nova entrega" tem seu próprio shell com mapa (NovoPedidoFlow); as telas
// estáticas (histórico, carteira, comunicados, perfil) usam este.
// O drawer se adapta ao papel: operador não vê Financeiro/Integração nem gere Equipe.
export default function NegocioShell({ title, children }: { title: string; children: React.ReactNode }) {
  const p = usePathname();
  const [papel, setPapel] = useState<string | null>(null);
  const it = (ic: IconName, label: string, href: string) => ({ ic, label, href, active: p.startsWith(href) });

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    sb.rpc("meu_papel_negocio").then(({ data }) => setPapel((data as string) ?? "operador"));
  }, []);

  const pleno = papel === "dono" || papel === "gerente";

  const gestao = [it("star", "Avaliações", "/negocio/avaliacoes")];
  if (pleno) {
    gestao.push(it("bolt", "Integração / API", "/negocio/integracao"));
    gestao.push(it("user", "Equipe", "/negocio/equipe"));
  }

  const nav: ShellNavGroup[] = [
    {
      group: "Operação",
      items: [
        it("pkg", "Nova entrega", "/negocio/novo-pedido"),
        it("list", "Histórico", "/negocio/historico"),
        it("chart", "Relatórios", "/negocio/relatorios"),
      ],
    },
    ...(pleno ? [{ group: "Financeiro", items: [it("money", "Carteira", "/negocio/carteira")] }] : []),
    { group: "Gestão", items: gestao },
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
