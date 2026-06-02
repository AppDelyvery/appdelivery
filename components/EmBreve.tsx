import Link from "next/link";
import { Icon, type IconName } from "./Icons";

export default function EmBreve({
  titulo,
  ic = "bolt",
  descricao,
}: {
  titulo: string;
  ic?: IconName;
  descricao: string;
}) {
  return (
    <div className="login-screen">
      <div className="login-card" style={{ textAlign: "center" }}>
        <div className="lg-logo">
          <div className="mark">
            <Icon name="moto" />
          </div>
          <div className="name">
            <b>APP</b>
            <span>DELYVERY</span>
          </div>
        </div>
        <div className="done-hero" style={{ padding: "10px 0 0" }}>
          <div className="circle" style={{ background: "var(--brand-light)" }}>
            <Icon name={ic} style={{ width: 32, height: 32, color: "var(--brand)" }} />
          </div>
          <div className="t">{titulo}</div>
          <div className="s">{descricao}</div>
        </div>
        <Link href="/" className="btn btn-ghost" style={{ marginTop: 18, textDecoration: "none" }}>
          <Icon name="arrow" /> Voltar ao início
        </Link>
      </div>
    </div>
  );
}
