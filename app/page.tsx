import Link from "next/link";
import { Icon, type IconName } from "@/components/Icons";

const ROLES: { href: string; ic: IconName; titulo: string; sub: string }[] = [
  { href: "/cadastro", ic: "building", titulo: "Sou um Negócio", sub: "peço e acompanho minhas entregas" },
  { href: "/cadastro/entregador", ic: "moto", titulo: "Sou Entregador", sub: "recebo e faço corridas" },
  { href: "/admin", ic: "chart", titulo: "Operação", sub: "painel de gestão e aprovações" },
];

export default function Entrada() {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="lg-logo">
          <div className="mark">
            <Icon name="moto" />
          </div>
          <div className="name">
            <b>APP</b>
            <span>DELYVERY</span>
          </div>
        </div>
        <div className="lg-sub">Logística sob demanda · Palmas-TO</div>
        {ROLES.map((r) => (
          <Link key={r.href} href={r.href} className="lg-role">
            <div className="ic">
              <Icon name={r.ic} />
            </div>
            <div>
              <div className="rt">{r.titulo}</div>
              <div className="rs">{r.sub}</div>
            </div>
            <span className="arr">
              <Icon name="arrow" />
            </span>
          </Link>
        ))}
        <div className="lg-foot">Protótipo de demonstração · dados simulados</div>
      </div>
    </div>
  );
}
