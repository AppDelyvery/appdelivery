"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./Icons";
import UserMenu from "./UserMenu";

export type Persona = "negocio" | "entregador" | "admin";
export type ShellNavItem = {
  ic: IconName;
  label: string;
  active?: boolean;
  badge?: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
};
export type ShellNavGroup = { group: string; items: ShellNavItem[] };

export default function AppShell({
  title,
  nav,
  noMap = false,
  children,
}: {
  title: string;
  nav: ShellNavGroup[];
  demo?: Persona; // mantido só p/ compatibilidade dos callers; não há mais troca de persona
  noMap?: boolean;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const fechar = () => setNavOpen(false);
  return (
    <div className="shell">
      {navOpen && <div className="nav-scrim" onClick={fechar} />}
      <aside className={`sidebar${navOpen ? " open" : ""}`}>
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

        {nav.map((gr) => (
          <div className="sb-group" key={gr.group}>
            <div className="gh">{gr.group}</div>
            {gr.items.map((it) =>
              it.href ? (
                <Link key={it.label} href={it.href} className={`sb-item${it.active ? " active" : ""}`} onClick={fechar}>
                  <Icon name={it.ic} />
                  <span>{it.label}</span>
                  {it.badge && <span className="badge">{it.badge}</span>}
                </Link>
              ) : (
                <button
                  key={it.label}
                  className={`sb-item${it.active ? " active" : ""}`}
                  disabled={it.disabled}
                  onClick={() => {
                    it.onClick?.();
                    fechar();
                  }}
                >
                  <Icon name={it.ic} />
                  <span>{it.label}</span>
                  {it.badge && <span className="badge">{it.badge}</span>}
                </button>
              ),
            )}
          </div>
        ))}

      </aside>

      <main className="main">
        <div className="topbar">
          <div className="topbar-l">
            <button className="nav-toggle" onClick={() => setNavOpen(true)} aria-label="Abrir menu">
              <Icon name="menu" />
            </button>
            <div>
              <div className="tt">{title}</div>
              <div className="ts">APPDELYVERY · Logística sob demanda · Palmas-TO</div>
            </div>
          </div>
          <div className="right">
            <UserMenu />
          </div>
        </div>
        <div className={`content${noMap ? " no-map" : ""}`}>{children}</div>
      </main>
    </div>
  );
}
