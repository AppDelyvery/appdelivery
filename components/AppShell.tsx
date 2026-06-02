"use client";

import Link from "next/link";
import { Icon, type IconName } from "./Icons";
import { useEntrega, type NegocioView } from "./negocio/EntregaContext";

const TITLES: Record<NegocioView, string> = {
  form: "Nova entrega",
  matching: "Buscando entregador",
  tracking: "Entrega em andamento",
  done: "Entrega concluída",
};

type NavItem = { ic: IconName; label: string; view?: NegocioView; activeOn?: NegocioView[]; badge?: string };
const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Operação",
    items: [
      { ic: "send", label: "Nova entrega", view: "form", activeOn: ["form"] },
      { ic: "moto", label: "Em andamento", view: "tracking", activeOn: ["matching", "tracking", "done"] },
      { ic: "list", label: "Histórico", badge: "em breve" },
    ],
  },
  {
    group: "Conta",
    items: [
      { ic: "money", label: "Carteira", badge: "em breve" },
      { ic: "building", label: "Meu negócio", badge: "em breve" },
    ],
  },
];

const DEMO: { persona: string; ic: IconName; label: string; href: string; on?: boolean }[] = [
  { persona: "negocio", ic: "building", label: "Negócio", href: "/negocio/novo-pedido", on: true },
  { persona: "entregador", ic: "moto", label: "Entregador", href: "/entregador" },
  { persona: "admin", ic: "chart", label: "Operação", href: "/admin" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { view, setView } = useEntrega();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sb-logo">
          <div className="mark">
            <Icon name="moto" />
          </div>
          <div>
            <div className="name">
              <b>APP</b>
              <span>DELYVERY</span>
            </div>
            <div className="sub">Palmas-TO</div>
          </div>
        </div>

        {NAV.map((gr) => (
          <div className="sb-group" key={gr.group}>
            <div className="gh">{gr.group}</div>
            {gr.items.map((it) => {
              const active = it.activeOn?.includes(view) ?? false;
              return (
                <button
                  key={it.label}
                  className={`sb-item${active ? " active" : ""}`}
                  disabled={!it.view}
                  onClick={() => it.view && setView(it.view)}
                >
                  <Icon name={it.ic} />
                  <span>{it.label}</span>
                  {it.badge && <span className="badge">{it.badge}</span>}
                </button>
              );
            })}
          </div>
        ))}

        <div className="sb-bottom">
          <div className="sb-demo-h">Demo · ver como</div>
          <div className="sb-demo">
            {DEMO.map((d) => (
              <Link key={d.persona} href={d.href} className={d.on ? "on" : ""}>
                <Icon name={d.ic} />
                {d.label}
              </Link>
            ))}
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <div className="tt">{TITLES[view]}</div>
            <div className="ts">APPDELYVERY · Logística sob demanda · Palmas-TO</div>
          </div>
          <div className="right">
            <span className="demo-tag">
              <Icon name="bolt" /> Protótipo
            </span>
          </div>
        </div>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
